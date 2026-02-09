/**
 * Type definitions for Email Integration module
 */

import { EmailProtocol, EmailSecurity, EmailMessageStatus, Category, Priority } from '@prisma/client';

// ============================================
// Email Account Types
// ============================================

export interface EmailAccountConfig {
  id?: number;
  name: string;
  emailAddress: string;
  protocol: EmailProtocol;
  host: string;
  port: number;
  security: EmailSecurity;
  username: string;
  password: string;  // Should be encrypted
  checkInterval: number;
  defaultCategory: Category;
  defaultPriority: Priority;
  defaultAssigneeId?: number;
  autoReplyEnabled: boolean;
  autoReplySubject?: string;
  autoReplyBody?: string;
  isActive: boolean;
}

export interface EmailAccountResponse {
  id: number;
  name: string;
  emailAddress: string;
  protocol: EmailProtocol;
  host: string;
  port: number;
  security: EmailSecurity;
  username: string;
  checkInterval: number;
  defaultCategory: Category;
  defaultPriority: Priority;
  defaultAssigneeId?: number;
  autoReplyEnabled: boolean;
  autoReplySubject?: string;
  autoReplyBody?: string;
  isActive: boolean;
  isConnected: boolean;
  lastCheckedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Email Message Types
// ============================================

export interface EmailAddress {
  address: string;
  name?: string;
}

export interface EmailAttachmentData {
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
  contentId?: string;
  checksum?: string;
}

export interface ParsedEmail {
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  bodyPlain?: string;
  bodyHtml?: string;
  sentAt: Date;
  receivedAt: Date;
  attachments: EmailAttachmentData[];
  headers: Record<string, string>;
  rawSize: number;
}

export interface EmailMessageResponse {
  id: number;
  accountId: number;
  messageId: string;
  threadId?: string;
  fromAddress: string;
  fromName?: string;
  toAddresses: EmailAddress[];
  ccAddresses?: EmailAddress[];
  subject: string;
  bodyPlain?: string;
  bodyHtml?: string;
  sentAt: Date;
  receivedAt: Date;
  status: EmailMessageStatus;
  ticketId?: number;
  isReply: boolean;
  isBounce: boolean;
  isAutoReply: boolean;
  processedAt?: Date;
  processingError?: string;
  attachments: EmailAttachmentResponse[];
}

export interface EmailAttachmentResponse {
  id: number;
  fileName: string;
  contentType: string;
  size: number;
  fileUrl: string;
  isInline: boolean;
}

// ============================================
// Email Processing Types
// ============================================

export interface EmailProcessingResult {
  success: boolean;
  messageId: string;
  ticketId?: number;
  action: 'created' | 'replied' | 'ignored' | 'failed';
  error?: string;
}

export interface EmailThreadData {
  id: number;
  threadId: string;
  subject: string;
  participants: string[];
  ticketId?: number;
  messageCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  isResolved: boolean;
}

// ============================================
// Email Check/Receive Types
// ============================================

export interface EmailCheckResult {
  accountId: number;
  accountEmail: string;
  checkedAt: Date;
  newMessages: number;
  processed: number;
  failed: number;
  errors?: string[];
}

export interface EmailReceiveOptions {
  markAsRead?: boolean;
  deleteAfterProcessing?: boolean;
  maxMessages?: number;
  sinceDate?: Date;
}

// ============================================
// Email Send Types (for replies)
// ============================================

export interface EmailSendConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string;
}

export interface SendEmailRequest {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  bodyPlain: string;
  bodyHtml?: string;
  attachments?: EmailAttachmentData[];
  inReplyTo?: string;
  references?: string[];
}

// ============================================
// Email Events
// ============================================

export enum EmailEventType {
  EMAIL_RECEIVED = 'email.received',
  EMAIL_PROCESSED = 'email.processed',
  EMAIL_FAILED = 'email.failed',
  TICKET_CREATED_FROM_EMAIL = 'ticket.created_from_email',
  TICKET_REPLIED_FROM_EMAIL = 'ticket.replied_from_email',
}

export interface EmailReceivedEventData {
  messageId: string;
  accountId: number;
  fromAddress: string;
  subject: string;
  receivedAt: Date;
}

export interface TicketCreatedFromEmailEventData {
  ticketId: number;
  ticketNumber: string;
  messageId: string;
  fromAddress: string;
  subject: string;
}

// ============================================
// Bounce/Auto-Reply Detection
// ============================================

export interface BounceDetectionResult {
  isBounce: boolean;
  bounceType?: 'hard' | 'soft';
  bounceReason?: string;
  originalMessageId?: string;
}

export interface AutoReplyDetectionResult {
  isAutoReply: boolean;
  autoReplyType?: 'out_of_office' | 'auto_responder' | 'vacation';
}

// ============================================
// Email Template Types
// ============================================

export interface EmailTemplate {
  id?: number;
  name: string;
  subject: string;
  bodyPlain: string;
  bodyHtml?: string;
  isDefault: boolean;
  category?: Category;
}

// ============================================
// Email Statistics
// ============================================

export interface EmailStatistics {
  accountId: number;
  accountEmail: string;
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  ignoredMessages: number;
  ticketsCreated: number;
  averageProcessingTime: number;
  lastCheckAt?: Date;
  dailyStats: {
    date: string;
    received: number;
    processed: number;
    failed: number;
  }[];
}
