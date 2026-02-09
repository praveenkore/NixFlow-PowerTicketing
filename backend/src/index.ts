import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Status } from '@prisma/client';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getEventBus } from './events/event-bus';
import { AutomationService } from './services/automation.service';
import {
  TicketEventType,
  TicketCreatedEventData,
  TicketUpdatedEventData,
  TicketStatusChangedEventData,
  TicketApprovedEventData,
  TicketRejectedEventData,
} from './events/event-types';

/**
 * Main entry point for the NixFlow backend.
 */

const prisma = new PrismaClient();
const app = express();

// Initialize event bus
const eventBus = getEventBus({
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  enableLogging: true,
  enableDeduplication: true,
});

// Initialize automation service
const automationService = new AutomationService(eventBus, prisma);

// Create HTTP server and Socket.IO server
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production') as any;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.data.user = user;
    next();
  } catch (error) {
    console.error('[Socket.IO] Authentication failed:', error);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Handle Connection and Rooms
io.on('connection', (socket) => {
  const user = socket.data.user;
  if (user) {
    console.log(`[Socket.IO] User connected: ${user.name} (${user.id})`);

    // Join personal room
    socket.join(`user-${user.id}`);

    // Join Admin room if applicable
    if (user.role === 'Admin') {
      socket.join('admin-room');
    }
  }
});

/**
 * Send event to specific users
 */
function sendEventToUsers(userIds: number[], eventType: string, data: any) {
  userIds.forEach(userId => {
    io.to(`user-${userId}`).emit(eventType, data);
  });
}

/**
 * Send event to all Admins
 */
function sendEventToAdmins(eventType: string, data: any) {
  io.to('admin-room').emit(eventType, data);
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Start the application
 */
async function startServer() {
  try {
    // 1. Connect to event bus
    await eventBus.connect();
    console.log('[Backend] Event bus connected');

    // 2. Load controllers after EventBus is connected
    const slaController = require('./controllers/sla.controller').default;
    const formController = require('./controllers/form.controller').default;
    const kbController = require('./controllers/kb.controller').default;
    const emailController = require('./controllers/email.controller').default;

    // 3. Global Middlewares
    app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express.json());

    // 4. Rate Limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { error: 'Too many requests from this IP, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api', limiter);

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20, // Relaxed for development/testing
      message: { error: 'Too many login attempts, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/login', authLimiter);

    // 5. Authentication Middleware
    const authenticate = async (req: any, res: any, next: any) => {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, name: true, email: true, role: true },
        });

        if (!user) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };

    /**
     * Utility: generate a unique ticket identifier
     */
    async function generateTicketId(): Promise<string> {
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const count = await prisma.ticket.count({ where: { createdAt: { gte: todayStart } } });
      const sequence = String(count + 1).padStart(4, '0');
      return `TKT-${datePart}-${sequence}`;
    }

    // 6. Routes

    // ----- Authentication Endpoints -----
    app.post('/api/login', async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        const { password: _, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });
      } catch (err: any) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // ----- User Endpoints -----
    app.get('/api/users', authenticate, async (_req, res) => {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
      });
      res.json(users);
    });

    app.post('/api/users', authenticate, async (req, res) => {
      const { name, email, password, role } = req.body;
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: { name, email, password: hashedPassword, role },
          select: { id: true, name: true, email: true, role: true },
        });
        res.status(201).json(user);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    // ----- Workflow Endpoints -----
    app.get('/api/workflows', authenticate, async (_req, res) => {
      const workflows = await prisma.workflow.findMany({ include: { stages: true } });
      res.json(workflows);
    });

    app.get('/api/workflows/:id', authenticate, async (req, res) => {
      const { id } = req.params;
      const wf = await prisma.workflow.findUnique({ where: { id: Number(id) }, include: { stages: true } });
      if (!wf) return res.status(404).json({ error: 'Workflow not found' });
      res.json(wf);
    });

    // ----- Ticket Endpoints -----
    app.get('/api/tickets', authenticate, async (req, res) => {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const skip = (page - 1) * pageSize;
      const totalCount = await prisma.ticket.count();
      const totalPages = Math.ceil(totalCount / pageSize);

      const tickets = await prisma.ticket.findMany({
        skip,
        take: pageSize,
        include: {
          requestor: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
          comments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          workflow: { include: { stages: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        tickets,
        pagination: { page, pageSize, totalCount, totalPages },
      });
    });

    app.get('/api/tickets/:id', authenticate, async (req, res) => {
      const { id } = req.params;
      const ticket = await prisma.ticket.findUnique({
        where: { id: Number(id) },
        include: {
          requestor: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
          comments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          workflow: { include: { stages: true } },
        },
      });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      res.json(ticket);
    });

    app.post('/api/tickets', authenticate, async (req, res) => {
      const { title, description, requestorId, assigneeId, priority, category, workflowId } = req.body;
      try {
        const ticketId = await generateTicketId();
        const newTicket = await prisma.ticket.create({
          data: {
            ticketId,
            title,
            description,
            requestorId: Number(requestorId),
            assigneeId: Number(assigneeId),
            status: Status.InApproval,
            priority,
            category,
            workflowId,
            historyLogs: {
              create: {
                action: 'Submitted',
                details: workflowId ? `Submitted to workflow ${workflowId}.` : undefined,
                userId: req.user!.id,
              },
            },
          },
          include: {
            requestor: { select: { id: true, name: true, email: true, role: true } },
            assignee: { select: { id: true, name: true, email: true, role: true } },
            comments: true,
            historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            workflow: { include: { stages: true } },
          },
        });

        await eventBus.emit(TicketEventType.TICKET_CREATED, {
          ticketId: newTicket.id,
          ticketNumber: newTicket.ticketId,
          title: newTicket.title,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
          status: newTicket.status,
          requestorId: newTicket.requestorId,
          assigneeId: newTicket.assigneeId,
          workflowId: newTicket.workflowId,
          currentStageIndex: newTicket.currentStageIndex,
        } as TicketCreatedEventData, { userId: req.user!.id, source: 'backend' });

        // Target: Requestor, Assignee, and Admins
        const recipients = [newTicket.requestorId, newTicket.assigneeId];
        // Remove duplicates
        const uniqueRecipients = [...new Set(recipients)];

        const eventData = {
          ticketId: newTicket.id,
          ticketNumber: newTicket.ticketId,
          title: newTicket.title,
          category: newTicket.category,
          priority: newTicket.priority,
          status: newTicket.status,
        };

        sendEventToUsers(uniqueRecipients, TicketEventType.TICKET_CREATED, eventData);
        sendEventToAdmins(TicketEventType.TICKET_CREATED, eventData);

        res.status(201).json(newTicket);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    app.put('/api/tickets/:id', authenticate, async (req, res) => {
      const ticketId = Number(req.params.id);
      const { title, description, priority, category, assigneeId } = req.body;
      try {
        const existingTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
        });

        if (!existingTicket) return res.status(404).json({ error: 'Ticket not found' });

        const changes: any[] = [];
        if (title && title !== existingTicket.title) changes.push({ field: 'title', oldValue: existingTicket.title, newValue: title });
        if (description && description !== existingTicket.description) changes.push({ field: 'description', oldValue: existingTicket.description, newValue: description });
        if (priority && priority !== existingTicket.priority) changes.push({ field: 'priority', oldValue: existingTicket.priority, newValue: priority });
        if (category && category !== existingTicket.category) changes.push({ field: 'category', oldValue: existingTicket.category, newValue: category });
        if (assigneeId && assigneeId !== existingTicket.assigneeId) changes.push({ field: 'assigneeId', oldValue: existingTicket.assigneeId, newValue: assigneeId });

        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: {
            ...(title && { title }),
            ...(description && { description }),
            ...(priority && { priority }),
            ...(category && { category }),
            ...(assigneeId && { assigneeId: Number(assigneeId) }),
            updatedAt: new Date(),
            historyLogs: {
              create: {
                action: 'Updated',
                details: `Ticket updated: ${changes.map(c => c.field).join(', ')}`,
                userId: req.user!.id,
              },
            },
          },
          include: {
            requestor: { select: { id: true, name: true, email: true, role: true } },
            assignee: { select: { id: true, name: true, email: true, role: true } },
            comments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            workflow: { include: { stages: true } },
          },
        });

        if (changes.length > 0) {
          await eventBus.emit(TicketEventType.TICKET_UPDATED, {
            ticketId: updatedTicket.id,
            ticketNumber: updatedTicket.ticketId,
            changes,
            updatedBy: req.user!.id,
          } as TicketUpdatedEventData, { userId: req.user!.id, source: 'backend' });

          // Target: Requestor, Assignee, Watchers, and Admins
          const watchers = updatedTicket.watchers.map((w: any) => w.user.id);
          const recipients = [
            updatedTicket.requestor.id,
            updatedTicket.assignee.id,
            ...watchers
          ];
          const uniqueRecipients = [...new Set(recipients)];

          const eventData = {
            ticketId: updatedTicket.id,
            ticketNumber: updatedTicket.ticketId,
            changes,
          };

          sendEventToUsers(uniqueRecipients, TicketEventType.TICKET_UPDATED, eventData);
          sendEventToAdmins(TicketEventType.TICKET_UPDATED, eventData);
        }
        res.json(updatedTicket);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    app.post('/api/tickets/:id/approve', authenticate, async (req, res) => {
      const ticketId = Number(req.params.id);
      const { comment } = req.body;
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { workflow: { include: { stages: true } } },
      });
      if (!ticket || !ticket.workflow) return res.status(400).json({ error: 'Ticket or workflow not found' });

      const nextStageIndex = ticket.currentStageIndex + 1;
      const isFinal = nextStageIndex >= ticket.workflow.stages.length;
      const newStatus = isFinal ? Status.Approved : Status.InApproval;
      const updatedStageIndex = isFinal ? ticket.currentStageIndex : nextStageIndex;

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          currentStageIndex: updatedStageIndex,
          historyLogs: {
            create: {
              action: 'Approved',
              details: isFinal ? 'Final stage approved.' : `Stage ${ticket.currentStageIndex + 1} approved.`,
              comment,
              userId: req.user!.id,
            },
          },
        },
        include: {
          requestor: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
          comments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          workflow: { include: { stages: true } },
        },
      });

      await eventBus.emit(TicketEventType.TICKET_STATUS_CHANGED, {
        ticketId: updatedTicket.id,
        ticketNumber: updatedTicket.ticketId,
        oldStatus: ticket.status,
        newStatus: updatedTicket.status,
        changedBy: req.user!.id,
        reason: comment,
      } as TicketStatusChangedEventData, { userId: req.user!.id, source: 'backend' });

      await eventBus.emit(TicketEventType.TICKET_APPROVED, {
        ticketId: updatedTicket.id,
        ticketNumber: updatedTicket.ticketId,
        approvedBy: req.user!.id,
        stageIndex: ticket.currentStageIndex,
        comment,
      } as TicketApprovedEventData, { userId: req.user!.id, source: 'backend' });

      // Target: Requestor, Assignee, Watchers, and Admins
      const watchers = updatedTicket.watchers.map((w: any) => w.user.id);
      const recipients = [
        updatedTicket.requestor.id,
        updatedTicket.assignee.id,
        ...watchers
      ];
      const uniqueRecipients = [...new Set(recipients)];

      const eventData = {
        ticketId: updatedTicket.id,
        ticketNumber: updatedTicket.ticketId,
        oldStatus: ticket.status,
        newStatus: updatedTicket.status,
      };

      sendEventToUsers(uniqueRecipients, TicketEventType.TICKET_STATUS_CHANGED, eventData);
      sendEventToAdmins(TicketEventType.TICKET_STATUS_CHANGED, eventData);

      res.json(updatedTicket);
    });

    app.post('/api/tickets/:id/reject', authenticate, async (req, res) => {
      const ticketId = Number(req.params.id);
      const { comment } = req.body;
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'Rejected' as Status,
          assigneeId: ticket.requestorId,
          currentStageIndex: 0,
          historyLogs: {
            create: {
              action: 'Rejected',
              details: 'Ticket rejected and returned to requestor.',
              comment,
              userId: req.user!.id,
            },
          },
        },
        include: {
          requestor: { select: { id: true, name: true, email: true, role: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
          comments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          workflow: { include: { stages: true } },
        },
      });

      await eventBus.emit(TicketEventType.TICKET_STATUS_CHANGED, {
        ticketId: updatedTicket.id,
        ticketNumber: updatedTicket.ticketId,
        oldStatus: ticket.status,
        newStatus: updatedTicket.status,
        changedBy: req.user!.id,
        reason: comment,
      } as TicketStatusChangedEventData, { userId: req.user!.id, source: 'backend' });

      await eventBus.emit(TicketEventType.TICKET_REJECTED, {
        ticketId: updatedTicket.id,
        ticketNumber: updatedTicket.ticketId,
        rejectedBy: req.user!.id,
        stageIndex: ticket.currentStageIndex,
        reason: comment || 'No reason provided',
      } as TicketRejectedEventData, { userId: req.user!.id, source: 'backend' });

      // Target: Requestor (now assignee), old assignee, Watchers, and Admins
      const watchers = updatedTicket.watchers.map((w: any) => w.user.id);
      const recipients = [
        ticket.requestorId,
        ticket.assigneeId,
        ...watchers
      ];
      const uniqueRecipients = [...new Set(recipients)];

      const eventData = {
        ticketId: updatedTicket.id,
        ticketNumber: updatedTicket.ticketId,
        oldStatus: ticket.status,
        newStatus: updatedTicket.status,
      };

      sendEventToUsers(uniqueRecipients, TicketEventType.TICKET_STATUS_CHANGED, eventData);
      sendEventToAdmins(TicketEventType.TICKET_STATUS_CHANGED, eventData);

      res.json(updatedTicket);
    });

    app.post('/api/tickets/:id/watchers', authenticate, async (req, res) => {
      const ticketId = Number(req.params.id);
      const { userId } = req.body;
      try {
        await prisma.ticketWatcher.upsert({
          where: { ticketId_userId: { ticketId, userId: Number(userId) } },
          update: {},
          create: { ticketId, userId: Number(userId) },
        });
        await prisma.historyLog.create({
          data: {
            action: 'Watcher Added',
            details: `User ${userId} added as watcher`,
            userId: req.user!.id,
            ticketId,
          },
        });
        const updatedTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: {
            requestor: { select: { id: true, name: true, email: true, role: true } },
            assignee: { select: { id: true, name: true, email: true, role: true } },
            comments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            historyLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            watchers: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            workflow: { include: { stages: true } },
          },
        });
        res.json(updatedTicket);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    // ----- SLA Endpoints -----
    app.post('/api/sla/policies', authenticate, (req, res) => slaController.createSLAPolicy(req, res));
    app.get('/api/sla/policies', authenticate, (req, res) => slaController.getSLAPolicies(req, res));
    app.get('/api/sla/policies/:id', authenticate, (req, res) => slaController.getSLAPolicy(req, res));
    app.put('/api/sla/policies/:id', authenticate, (req, res) => slaController.updateSLAPolicy(req, res));
    app.delete('/api/sla/policies/:id', authenticate, (req, res) => slaController.deleteSLAPolicy(req, res));
    app.get('/api/sla/metrics', authenticate, (req, res) => slaController.getSLAMetrics(req, res));
    app.get('/api/sla/metrics/ticket/:ticketId', authenticate, (req, res) => slaController.getSLAMetricByTicketId(req, res));
    app.get('/api/sla/breaches', authenticate, (req, res) => slaController.getSLABreaches(req, res));
    app.post('/api/sla/breaches/:id/acknowledge', authenticate, (req, res) => slaController.acknowledgeBreach(req, res));
    app.get('/api/sla/dashboard/stats', authenticate, (req, res) => slaController.getDashboardStats(req, res));
    app.get('/api/sla/reports/compliance', authenticate, (req, res) => slaController.getComplianceReport(req, res));

    // ----- Form Builder Endpoints -----
    app.post('/api/forms', authenticate, formController.createForm);
    app.get('/api/forms', authenticate, formController.getForms);
    app.get('/api/forms/field-types', authenticate, formController.getFieldTypes);
    app.get('/api/forms/templates', authenticate, formController.getTemplates);
    app.get('/api/forms/:id', authenticate, formController.getFormById);
    app.put('/api/forms/:id', authenticate, formController.updateForm);
    app.delete('/api/forms/:id', authenticate, formController.deleteForm);
    app.post('/api/forms/:id/clone', authenticate, formController.cloneForm);
    app.post('/api/forms/:id/template', authenticate, formController.createTemplate);
    app.get('/api/forms/:id/analytics', authenticate, formController.getFormAnalytics);
    app.get('/api/form-submissions', authenticate, formController.getSubmissions);
    app.post('/api/form-submissions/:id/convert', authenticate, formController.convertSubmission);
    app.get('/api/public/forms/:slug', formController.getFormBySlug);
    app.post('/api/public/forms/submit', formController.submitForm);

    // ----- Knowledge Base Endpoints -----
    app.use('/api/kb', (req, res, next) => {
      (req as any).eventBus = eventBus;
      next();
    });
    app.use('/api/kb', authenticate, kbController);

    // ----- Email Integration Endpoints -----
    app.post('/api/email/accounts', authenticate, emailController.createAccount);
    app.get('/api/email/accounts', authenticate, emailController.getAccounts);
    app.get('/api/email/accounts/:id', authenticate, emailController.getAccount);
    app.put('/api/email/accounts/:id', authenticate, emailController.updateAccount);
    app.delete('/api/email/accounts/:id', authenticate, emailController.deleteAccount);
    app.post('/api/email/accounts/:id/test', authenticate, emailController.testConnection);
    app.post('/api/email/accounts/:id/check', authenticate, emailController.checkAccount);
    app.post('/api/email/check-all', authenticate, emailController.checkAllAccounts);
    app.get('/api/email/messages', authenticate, emailController.getMessages);
    app.get('/api/email/messages/:id', authenticate, emailController.getMessage);
    app.get('/api/email/statistics', authenticate, emailController.getStatistics);

    // 7. Global 404 handler
    app.use((_req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // 8. Start the server
    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      console.log(`NixFlow backend listening on port ${port}`);
      console.log(`Socket.IO server running on port ${port}`);
    });
  } catch (error) {
    console.error('[Backend] Failed to start server:', error);
    process.exit(1);
  }
}

// Global unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

