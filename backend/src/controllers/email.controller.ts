/**
 * Email Controller - HTTP request handlers for Email Integration module
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service';
import { EventBus, getEventBus } from '../events/event-bus';
import { EmailAccountConfig } from '../types/email.types';

export class EmailController {
  private emailService: EmailService;

  constructor(prisma: PrismaClient, eventBus: EventBus) {
    this.emailService = new EmailService(prisma, eventBus);
  }

  // ============================================
  // Email Account Management
  // ============================================

  /**
   * Create a new email account
   */
  createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const config: EmailAccountConfig = req.body;
      const userId = req.user!.id;

      // Validate required fields
      if (!config.name || !config.emailAddress || !config.host || !config.port || !config.username || !config.password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const account = await this.emailService.createAccount(config, userId);

      // Don't return password
      const { password, ...accountWithoutPassword } = account as any;

      res.status(201).json(accountWithoutPassword);
    } catch (error: any) {
      console.error('[EmailController] Error creating account:', error);
      res.status(400).json({ error: error.message || 'Failed to create email account' });
    }
  };

  /**
   * Update an email account
   */
  updateAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const accountId = parseInt(req.params.id);
      const config: Partial<EmailAccountConfig> = req.body;

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Invalid account ID' });
        return;
      }

      const account = await this.emailService.updateAccount(accountId, config);

      // Don't return password
      const { password, ...accountWithoutPassword } = account as any;

      res.json(accountWithoutPassword);
    } catch (error: any) {
      console.error('[EmailController] Error updating account:', error);
      res.status(400).json({ error: error.message || 'Failed to update email account' });
    }
  };

  /**
   * Get all email accounts
   */
  getAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { isActive } = req.query;
      const filters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      };

      const accounts = await this.emailService.getAccounts(filters);

      // Don't return passwords
      const accountsWithoutPasswords = accounts.map((account: any) => {
        const { password, ...rest } = account;
        return rest;
      });

      res.json(accountsWithoutPasswords);
    } catch (error: any) {
      console.error('[EmailController] Error getting accounts:', error);
      res.status(500).json({ error: error.message || 'Failed to get email accounts' });
    }
  };

  /**
   * Get a specific email account
   */
  getAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const accountId = parseInt(req.params.id);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Invalid account ID' });
        return;
      }

      const account = await this.emailService.getAccount(accountId);

      if (!account) {
        res.status(404).json({ error: 'Email account not found' });
        return;
      }

      // Don't return password
      const { password, ...accountWithoutPassword } = account as any;

      res.json(accountWithoutPassword);
    } catch (error: any) {
      console.error('[EmailController] Error getting account:', error);
      res.status(500).json({ error: error.message || 'Failed to get email account' });
    }
  };

  /**
   * Delete an email account
   */
  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const accountId = parseInt(req.params.id);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Invalid account ID' });
        return;
      }

      await this.emailService.deleteAccount(accountId);
      res.status(204).send();
    } catch (error: any) {
      console.error('[EmailController] Error deleting account:', error);
      res.status(400).json({ error: error.message || 'Failed to delete email account' });
    }
  };

  /**
   * Test email account connection
   */
  testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const accountId = parseInt(req.params.id);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Invalid account ID' });
        return;
      }

      const result = await this.emailService.testConnection(accountId);
      res.json(result);
    } catch (error: any) {
      console.error('[EmailController] Error testing connection:', error);
      res.status(500).json({ error: error.message || 'Failed to test connection' });
    }
  };

  // ============================================
  // Email Checking/Receiving
  // ============================================

  /**
   * Check a specific email account for new messages
   */
  checkAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const accountId = parseInt(req.params.id);
      const { markAsRead, maxMessages, sinceDate } = req.body || {};

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Invalid account ID' });
        return;
      }

      const result = await this.emailService.checkAccount(accountId, {
        markAsRead,
        maxMessages: maxMessages ? parseInt(maxMessages) : undefined,
        sinceDate: sinceDate ? new Date(sinceDate) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[EmailController] Error checking account:', error);
      res.status(400).json({ error: error.message || 'Failed to check email account' });
    }
  };

  /**
   * Check all active email accounts
   */
  checkAllAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { markAsRead, maxMessages, sinceDate } = req.body || {};

      const results = await this.emailService.checkAllAccounts({
        markAsRead,
        maxMessages: maxMessages ? parseInt(maxMessages) : undefined,
        sinceDate: sinceDate ? new Date(sinceDate) : undefined,
      });

      res.json(results);
    } catch (error: any) {
      console.error('[EmailController] Error checking all accounts:', error);
      res.status(500).json({ error: error.message || 'Failed to check email accounts' });
    }
  };

  // ============================================
  // Email Messages
  // ============================================

  /**
   * Get email messages
   */
  getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, ticketId, status } = req.query;

      const filters = {
        accountId: accountId ? parseInt(accountId as string) : undefined,
        ticketId: ticketId ? parseInt(ticketId as string) : undefined,
        status: status as any,
      };

      const messages = await this.emailService.getMessages(filters);
      res.json(messages);
    } catch (error: any) {
      console.error('[EmailController] Error getting messages:', error);
      res.status(500).json({ error: error.message || 'Failed to get email messages' });
    }
  };

  /**
   * Get a specific email message
   */
  getMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const messageId = parseInt(req.params.id);

      if (isNaN(messageId)) {
        res.status(400).json({ error: 'Invalid message ID' });
        return;
      }

      const message = await this.emailService.getMessage(messageId);

      if (!message) {
        res.status(404).json({ error: 'Email message not found' });
        return;
      }

      res.json(message);
    } catch (error: any) {
      console.error('[EmailController] Error getting message:', error);
      res.status(500).json({ error: error.message || 'Failed to get email message' });
    }
  };

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get email statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.query;
      const id = accountId ? parseInt(accountId as string) : undefined;

      const stats = await this.emailService.getStatistics(id);
      res.json(stats);
    } catch (error: any) {
      console.error('[EmailController] Error getting statistics:', error);
      res.status(500).json({ error: error.message || 'Failed to get email statistics' });
    }
  };
}

// Create and export controller instance
const prisma = new PrismaClient();
const eventBus = getEventBus();
const emailController = new EmailController(prisma, eventBus);

export default emailController;
