/**
 * Email Service - Handles email receiving, parsing, and ticket conversion
 */

import { PrismaClient, EmailAccount, EmailMessage, EmailAttachment, EmailMessageStatus, Category, Priority } from '@prisma/client';
import Imap from 'imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { htmlToText } from 'html-to-text';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { EventBus } from '../events/event-bus';
import {
  EmailAccountConfig,
  ParsedEmail,
  EmailAddress,
  EmailAttachmentData,
  EmailProcessingResult,
  EmailCheckResult,
  EmailReceiveOptions,
  BounceDetectionResult,
  AutoReplyDetectionResult,
  EmailEventType,
  TicketCreatedFromEmailEventData,
} from '../types/email.types';

export class EmailService {
  private prisma: PrismaClient;
  private eventBus: EventBus;
  private attachmentsDir: string;

  constructor(prisma: PrismaClient, eventBus: EventBus) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.attachmentsDir = process.env.EMAIL_ATTACHMENTS_DIR || './uploads/email-attachments';
    this.ensureAttachmentsDir();
  }

  private async ensureAttachmentsDir(): Promise<void> {
    try {
      await fs.mkdir(this.attachmentsDir, { recursive: true });
    } catch (error) {
      console.error('[EmailService] Failed to create attachments directory:', error);
    }
  }

  // ============================================
  // Email Account Management
  // ============================================

  async createAccount(config: EmailAccountConfig, createdById: number): Promise<EmailAccount> {
    // Encrypt password before storing
    const encryptedPassword = this.encryptPassword(config.password);

    return await this.prisma.emailAccount.create({
      data: {
        name: config.name,
        emailAddress: config.emailAddress,
        protocol: config.protocol,
        host: config.host,
        port: config.port,
        security: config.security,
        username: config.username,
        password: encryptedPassword,
        checkInterval: config.checkInterval,
        defaultCategory: config.defaultCategory,
        defaultPriority: config.defaultPriority,
        defaultAssigneeId: config.defaultAssigneeId,
        autoReplyEnabled: config.autoReplyEnabled,
        autoReplySubject: config.autoReplySubject,
        autoReplyBody: config.autoReplyBody,
        isActive: config.isActive,
        createdById,
      },
    });
  }

  async updateAccount(accountId: number, config: Partial<EmailAccountConfig>): Promise<EmailAccount> {
    const data: any = { ...config };

    // Encrypt password if provided
    if (config.password) {
      data.password = this.encryptPassword(config.password);
    }

    return await this.prisma.emailAccount.update({
      where: { id: accountId },
      data,
    });
  }

  async getAccount(accountId: number): Promise<EmailAccount | null> {
    return await this.prisma.emailAccount.findUnique({
      where: { id: accountId },
    });
  }

  async getAccounts(filters?: { isActive?: boolean }): Promise<EmailAccount[]> {
    const where: any = {};
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await this.prisma.emailAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAccount(accountId: number): Promise<void> {
    await this.prisma.emailAccount.delete({
      where: { id: accountId },
    });
  }

  async testConnection(accountId: number): Promise<{ success: boolean; error?: string }> {
    const account = await this.getAccount(accountId);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    try {
      await this.connectAndDisconnect(account);

      // Update connection status
      await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: { isConnected: true, lastError: null },
      });

      return { success: true };
    } catch (error: any) {
      // Update connection status
      await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: { isConnected: false, lastError: error.message },
      });

      return { success: false, error: error.message };
    }
  }

  // ============================================
  // Email Receiving (IMAP)
  // ============================================

  async checkAccount(accountId: number, options: EmailReceiveOptions = {}): Promise<EmailCheckResult> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error('Email account not found');
    }

    if (!account.isActive) {
      throw new Error('Email account is not active');
    }

    const result: EmailCheckResult = {
      accountId: account.id,
      accountEmail: account.emailAddress,
      checkedAt: new Date(),
      newMessages: 0,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const messages = await this.fetchMessages(account, options);
      result.newMessages = messages.length;

      for (const message of messages) {
        try {
          const processResult = await this.processEmail(account, message);
          if (processResult.success) {
            result.processed++;
          } else {
            result.failed++;
            if (processResult.error) {
              result.errors?.push(processResult.error);
            }
          }
        } catch (error: any) {
          result.failed++;
          result.errors?.push(`Failed to process ${message.messageId}: ${error.message}`);
        }
      }

      // Update last checked timestamp
      await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: { lastCheckedAt: new Date(), isConnected: true, lastError: null },
      });

      return result;
    } catch (error: any) {
      // Update connection status
      await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: { isConnected: false, lastError: error.message },
      });

      throw error;
    }
  }

  async checkAllAccounts(options: EmailReceiveOptions = {}): Promise<EmailCheckResult[]> {
    const accounts = await this.getAccounts({ isActive: true });
    const results: EmailCheckResult[] = [];

    for (const account of accounts) {
      try {
        const result = await this.checkAccount(account.id, options);
        results.push(result);
      } catch (error: any) {
        results.push({
          accountId: account.id,
          accountEmail: account.emailAddress,
          checkedAt: new Date(),
          newMessages: 0,
          processed: 0,
          failed: 0,
          errors: [error.message],
        });
      }
    }

    return results;
  }

  private async fetchMessages(account: EmailAccount, options: EmailReceiveOptions): Promise<ParsedEmail[]> {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(account);
      const messages: ParsedEmail[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          // Build search criteria
          const searchCriteria: any[] = ['UNSEEN'];
          if (options.sinceDate) {
            searchCriteria.push(['SINCE', options.sinceDate]);
          }

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              reject(err);
              return;
            }

            if (results.length === 0) {
              imap.end();
              resolve([]);
              return;
            }

            // Limit number of messages
            const limitedResults = options.maxMessages
              ? results.slice(0, options.maxMessages)
              : results;

            const fetch = imap.fetch(limitedResults, {
              bodies: '',
              struct: true,
            });

            fetch.on('message', (msg, seqno) => {
              let messageBuffer = Buffer.from('');

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  messageBuffer = Buffer.concat([messageBuffer, chunk]);
                });
              });

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(messageBuffer);
                  const email = await this.convertParsedMail(parsed, messageBuffer.length);
                  messages.push(email);

                  // Mark as read if requested
                  if (options.markAsRead) {
                    imap.addFlags(seqno, '\\Seen', () => { });
                  }

                  // Delete if requested
                  if (options.deleteAfterProcessing) {
                    imap.addFlags(seqno, '\\Deleted', () => { });
                  }
                } catch (error) {
                  console.error('[EmailService] Failed to parse message:', error);
                }
              });
            });

            fetch.once('error', (err) => {
              reject(err);
            });

            fetch.once('end', () => {
              imap.end();
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();
    });
  }

  private createImapConnection(account: EmailAccount): Imap {
    const tls = account.security === 'SSL' || account.security === 'TLS';
    const tlsOptions = account.security === 'STARTTLS' ? { starttls: true } : {};

    return new Imap({
      user: account.username,
      password: this.decryptPassword(account.password),
      host: account.host,
      port: account.port,
      tls,
      tlsOptions,
      connTimeout: 30000,
      authTimeout: 30000,
    });
  }

  private async connectAndDisconnect(account: EmailAccount): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = this.createImapConnection(account);

      imap.once('ready', () => {
        imap.end();
        resolve();
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();
    });
  }

  // ============================================
  // Email Processing
  // ============================================

  private async processEmail(account: EmailAccount, email: ParsedEmail): Promise<EmailProcessingResult> {
    // Check if message already exists
    const existingMessage = await this.prisma.emailMessage.findUnique({
      where: { messageId: email.messageId },
    });

    if (existingMessage) {
      return {
        success: true,
        messageId: email.messageId,
        action: 'ignored',
        error: 'Message already processed',
      };
    }

    // Detect bounce and auto-reply
    const bounceCheck = this.detectBounce(email);
    const autoReplyCheck = this.detectAutoReply(email);

    if (bounceCheck.isBounce || autoReplyCheck.isAutoReply) {
      await this.saveEmailMessage(account.id, email, {
        status: EmailMessageStatus.Ignored,
        isBounce: bounceCheck.isBounce,
        isAutoReply: autoReplyCheck.isAutoReply,
      });

      return {
        success: true,
        messageId: email.messageId,
        action: 'ignored',
      };
    }

    // Check if this is a reply to an existing ticket
    const existingTicket = await this.findTicketByThread(email);

    try {
      if (existingTicket) {
        // Add as comment to existing ticket
        await this.addReplyToTicket(existingTicket.id, account, email);

        return {
          success: true,
          messageId: email.messageId,
          ticketId: existingTicket.id,
          action: 'replied',
        };
      } else {
        // Create new ticket
        const ticket = await this.createTicketFromEmail(account, email);

        // Emit event
        await this.eventBus.emit(EmailEventType.TICKET_CREATED_FROM_EMAIL, {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketId,
          messageId: email.messageId,
          fromAddress: email.from.address,
          subject: email.subject,
        } as TicketCreatedFromEmailEventData);

        return {
          success: true,
          messageId: email.messageId,
          ticketId: ticket.id,
          action: 'created',
        };
      }
    } catch (error: any) {
      // Save failed message
      await this.saveEmailMessage(account.id, email, {
        status: EmailMessageStatus.Failed,
        processingError: error.message,
      });

      return {
        success: false,
        messageId: email.messageId,
        action: 'failed',
        error: error.message,
      };
    }
  }

  private async createTicketFromEmail(account: EmailAccount, email: ParsedEmail) {
    // Find or create user based on email address
    let requestor = await this.prisma.user.findUnique({
      where: { email: email.from.address },
    });

    if (!requestor) {
      // Create a placeholder user for unknown senders
      requestor = await this.prisma.user.create({
        data: {
          email: email.from.address,
          name: email.from.name || email.from.address,
          password: await this.generateRandomPassword(),
          role: 'Engineer', // Default role
        },
      });
    }

    // Generate ticket ID
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const count = await this.prisma.ticket.count({ where: { createdAt: { gte: todayStart } } });
    const sequence = String(count + 1).padStart(4, '0');
    const ticketNumber = `TKT-${datePart}-${sequence}`;

    // Create ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketId: ticketNumber,
        title: email.subject || '(No Subject)',
        description: email.bodyPlain || email.bodyHtml || '(No Content)',
        requestorId: requestor.id,
        assigneeId: account.defaultAssigneeId || requestor.id,
        status: 'InApproval',
        priority: account.defaultPriority,
        category: account.defaultCategory,
        historyLogs: {
          create: {
            action: 'Created from Email',
            details: `Ticket created from email sent by ${email.from.address}`,
            userId: requestor.id,
          },
        },
      },
    });

    // Save email message with ticket reference
    await this.saveEmailMessage(account.id, email, {
      ticketId: ticket.id,
      status: EmailMessageStatus.Processed,
    });

    return ticket;
  }

  private async addReplyToTicket(ticketId: number, account: EmailAccount, email: ParsedEmail) {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { email: email.from.address },
    });

    // Add comment to ticket
    await this.prisma.comment.create({
      data: {
        text: email.bodyPlain || email.bodyHtml || '(No Content)',
        userId: user?.id || 1, // Fallback to admin
        ticketId,
      },
    });

    // Add history log
    await this.prisma.historyLog.create({
      data: {
        action: 'Email Reply Received',
        details: `Reply received from ${email.from.address}`,
        userId: user?.id || 1,
        ticketId,
      },
    });

    // Save email message
    await this.saveEmailMessage(account.id, email, {
      ticketId,
      status: EmailMessageStatus.Processed,
      isReply: true,
    });
  }

  private async findTicketByThread(email: ParsedEmail) {
    // Check for in-reply-to header
    if (email.inReplyTo) {
      const message = await this.prisma.emailMessage.findFirst({
        where: { messageId: email.inReplyTo },
        include: { ticket: true },
      });

      if (message?.ticket) {
        return message.ticket;
      }
    }

    // Check for thread ID
    if (email.threadId) {
      const message = await this.prisma.emailMessage.findFirst({
        where: { threadId: email.threadId },
        include: { ticket: true },
        orderBy: { receivedAt: 'desc' },
      });

      if (message?.ticket) {
        return message.ticket;
      }
    }

    // Check for existing thread by subject + participants
    const normalizedSubject = this.normalizeSubject(email.subject);
    const thread = await this.prisma.emailMessage.findFirst({
      where: {
        subject: normalizedSubject,
        fromAddress: email.from.address,
        ticketId: { not: null },
      },
      include: { ticket: true },
      orderBy: { receivedAt: 'desc' },
    });

    return thread?.ticket || null;
  }

  // ============================================
  // Email Storage
  // ============================================

  private async saveEmailMessage(
    accountId: number,
    email: ParsedEmail,
    options: {
      ticketId?: number;
      status: EmailMessageStatus;
      isReply?: boolean;
      isBounce?: boolean;
      isAutoReply?: boolean;
      processingError?: string;
    }
  ): Promise<EmailMessage> {
    // Save attachments
    const savedAttachments: { fileName: string; filePath: string; fileUrl: string; contentType: string; size: number; isInline: boolean; contentId?: string }[] = [];

    for (const attachment of email.attachments) {
      if (attachment.content) {
        const saved = await this.saveAttachment(attachment);
        savedAttachments.push(saved);
      }
    }

    // Create email message
    const message = await this.prisma.emailMessage.create({
      data: {
        accountId,
        messageId: email.messageId,
        threadId: email.threadId,
        inReplyTo: email.inReplyTo,
        references: email.references ? JSON.stringify(email.references) : null,
        fromAddress: email.from.address,
        fromName: email.from.name,
        toAddresses: JSON.stringify(email.to),
        ccAddresses: email.cc ? JSON.stringify(email.cc) : null,
        subject: email.subject,
        bodyPlain: email.bodyPlain,
        bodyHtml: email.bodyHtml,
        sentAt: email.sentAt,
        receivedAt: email.receivedAt,
        status: options.status,
        ticketId: options.ticketId,
        isReply: options.isReply || false,
        isBounce: options.isBounce || false,
        isAutoReply: options.isAutoReply || false,
        processedAt: options.status === EmailMessageStatus.Processed ? new Date() : null,
        processingError: options.processingError,
        headers: JSON.stringify(email.headers),
        rawSize: email.rawSize,
        attachments: {
          create: savedAttachments.map(att => ({
            fileName: att.fileName,
            contentType: att.contentType,
            size: att.size,
            filePath: att.filePath,
            fileUrl: att.fileUrl,
            contentId: att.contentId,
            isInline: att.isInline,
          })),
        },
      },
    });

    return message;
  }

  private async saveAttachment(attachment: EmailAttachmentData): Promise<{ fileName: string; filePath: string; fileUrl: string; contentType: string; size: number; isInline: boolean; contentId?: string }> {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${attachment.filename}`;
    const filePath = path.join(this.attachmentsDir, fileName);

    // Write file
    if (attachment.content) {
      await fs.writeFile(filePath, attachment.content);
    }

    // Calculate checksum
    const checksum = attachment.content
      ? crypto.createHash('sha256').update(attachment.content).digest('hex')
      : undefined;

    // Generate URL
    const fileUrl = `/uploads/email-attachments/${fileName}`;

    return {
      fileName: attachment.filename,
      filePath,
      fileUrl,
      contentType: attachment.contentType,
      size: attachment.size,
      isInline: !!attachment.contentId,
      contentId: attachment.contentId,
    };
  }

  // ============================================
  // Email Parsing Helpers
  // ============================================

  private async convertParsedMail(parsed: ParsedMail, rawSize: number): Promise<ParsedEmail> {
    const extractAddresses = (addr: AddressObject | AddressObject[] | undefined): EmailAddress[] => {
      if (!addr) return [];
      const addrs = Array.isArray(addr) ? addr : [addr];
      return addrs.flatMap(a => a.value.map(v => ({ address: v.address, name: v.name })));
    };

    // Convert HTML to plain text if needed
    let bodyPlain = parsed.text || '';
    const bodyHtml = parsed.html || undefined;

    if (!bodyPlain && bodyHtml) {
      bodyPlain = htmlToText(bodyHtml, {
        wordwrap: false,
        selectors: [
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        ],
      });
    }

    // Extract attachments
    const attachments: EmailAttachmentData[] = (parsed.attachments || []).map(att => ({
      filename: att.filename || 'unnamed',
      contentType: att.contentType,
      size: att.size,
      content: att.content as Buffer,
      contentId: att.contentId,
    }));

    return {
      messageId: parsed.messageId || `generated-${Date.now()}`,
      threadId: parsed.threadId,
      inReplyTo: parsed.inReplyTo?.[0],
      references: parsed.references,
      from: {
        address: parsed.from?.value[0]?.address || 'unknown',
        name: parsed.from?.value[0]?.name,
      },
      to: extractAddresses(parsed.to),
      cc: extractAddresses(parsed.cc),
      subject: parsed.subject || '(No Subject)',
      bodyPlain,
      bodyHtml,
      sentAt: parsed.date || new Date(),
      receivedAt: new Date(),
      attachments,
      headers: parsed.headers as Record<string, string>,
      rawSize,
    };
  }

  // ============================================
  // Bounce and Auto-Reply Detection
  // ============================================

  private detectBounce(email: ParsedEmail): BounceDetectionResult {
    const headers = email.headers;
    const subject = email.subject.toLowerCase();
    const from = email.from.address.toLowerCase();

    // Check for common bounce indicators
    const bounceIndicators = [
      'delivery status notification',
      'undelivered mail',
      'mail delivery failed',
      'returned to sender',
      'bounce',
      'delivery failure',
    ];

    const isBounceSubject = bounceIndicators.some(indicator => subject.includes(indicator));
    const isBounceFrom = from.includes('mailer-daemon') || from.includes('postmaster');
    const hasBounceHeader = headers['X-Failed-Recipients'] || headers['X-Bounce-Id'];

    if (isBounceSubject || isBounceFrom || hasBounceHeader) {
      // Determine bounce type
      const body = (email.bodyPlain || '').toLowerCase();
      const isHardBounce =
        body.includes('user unknown') ||
        body.includes('mailbox does not exist') ||
        body.includes('invalid recipient') ||
        body.includes('address rejected');

      return {
        isBounce: true,
        bounceType: isHardBounce ? 'hard' : 'soft',
        bounceReason: email.bodyPlain?.substring(0, 200),
        originalMessageId: headers['X-Original-Message-ID'],
      };
    }

    return { isBounce: false };
  }

  private detectAutoReply(email: ParsedEmail): AutoReplyDetectionResult {
    const headers = email.headers;
    const subject = email.subject.toLowerCase();

    // Check for auto-reply headers
    const autoReplyHeaders = [
      'X-Autoreply',
      'X-Autorespond',
      'X-Auto-Response-Suppress',
      'Auto-Submitted',
    ];

    const hasAutoReplyHeader = autoReplyHeaders.some(header => headers[header]);

    // Check subject patterns
    const autoReplySubjects = [
      'out of office',
      'automatic reply',
      'auto-reply',
      'vacation',
      'away from office',
    ];

    const isAutoReplySubject = autoReplySubjects.some(indicator => subject.includes(indicator));

    if (hasAutoReplyHeader || isAutoReplySubject) {
      let autoReplyType: 'out_of_office' | 'auto_responder' | 'vacation' = 'auto_responder';

      if (subject.includes('out of office')) {
        autoReplyType = 'out_of_office';
      } else if (subject.includes('vacation')) {
        autoReplyType = 'vacation';
      }

      return { isAutoReply: true, autoReplyType };
    }

    return { isAutoReply: false };
  }

  // ============================================
  // Utility Methods
  // ============================================

  private normalizeSubject(subject: string): string {
    // Remove RE: and FWD: prefixes for matching
    return subject
      .replace(/^(RE:|FWD:|FW:)\s*/i, '')
      .trim()
      .toLowerCase();
  }

  private encryptPassword(password: string): string {
    const key = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!-';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key.slice(0, 32), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPassword(encryptedPassword: string): string {
    const key = process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!!!!-';
    const [ivHex, encrypted] = encryptedPassword.split(':');
    if (!ivHex || !encrypted) return encryptedPassword; // Not encrypted
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async generateRandomPassword(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  // ============================================
  // Public API Methods
  // ============================================

  async getMessages(filters?: {
    accountId?: number;
    ticketId?: number;
    status?: EmailMessageStatus;
  }): Promise<EmailMessage[]> {
    const where: any = {};
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.ticketId) where.ticketId = filters.ticketId;
    if (filters?.status) where.status = filters.status;

    return await this.prisma.emailMessage.findMany({
      where,
      include: { attachments: true },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async getMessage(messageId: number): Promise<EmailMessage | null> {
    return await this.prisma.emailMessage.findUnique({
      where: { id: messageId },
      include: { attachments: true, account: true },
    });
  }

  async getStatistics(accountId?: number): Promise<any> {
    const where: any = {};
    if (accountId) where.accountId = accountId;

    const [
      totalMessages,
      processedMessages,
      failedMessages,
      ignoredMessages,
      ticketsCreated,
    ] = await Promise.all([
      this.prisma.emailMessage.count({ where }),
      this.prisma.emailMessage.count({ where: { ...where, status: EmailMessageStatus.Processed } }),
      this.prisma.emailMessage.count({ where: { ...where, status: EmailMessageStatus.Failed } }),
      this.prisma.emailMessage.count({ where: { ...where, status: EmailMessageStatus.Ignored } }),
      this.prisma.emailMessage.count({ where: { ...where, ticketId: { not: null } } }),
    ]);

    return {
      totalMessages,
      processedMessages,
      failedMessages,
      ignoredMessages,
      ticketsCreated,
    };
  }
}
