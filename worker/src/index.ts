/**
 * NixFlow Worker Service - Main Entry Point
 * 
 * This is the main entry point for the SLA worker service that processes
 * background jobs for SLA monitoring, calculations, and notifications.
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { queueConfig, QueueNames } from './config/queue.config';
import { slaMonitoringJob } from './jobs/sla-monitoring.job';
import { slaCalculationJob } from './jobs/sla-calculation.job';
import { slaBreachNotificationJob } from './jobs/sla-breach-notification.job';
import { slaWarningNotificationJob } from './jobs/sla-warning-notification.job';
import { slaComplianceReportJob } from './jobs/sla-compliance-report.job';
import { ticketAutomationJob } from './jobs/ticket-automation.job';
import { escalationCheckJob } from './jobs/escalation-check.job';
import { getEventBus } from '../../backend/src/events/event-bus';
import { SLAMonitoringJobData, SLACalculationJobData, SLABreachNotificationJobData, SLAWarningNotificationJobData, SLAComplianceReportJobData, TicketAutomationJobData, EscalationCheckJobData } from './types';

const prisma = new PrismaClient();

// Worker instances
let slaMonitoringWorker: Worker | null = null;
let slaCalculationWorker: Worker | null = null;
let slaBreachNotificationWorker: Worker | null = null;
let slaWarningNotificationWorker: Worker | null = null;
let slaComplianceReportWorker: Worker | null = null;
let ticketAutomationWorker: Worker | null = null;
let escalationCheckWorker: Worker | null = null;

// Monitoring interval
let monitoringInterval: NodeJS.Timeout | null = null;
let escalationCheckInterval: NodeJS.Timeout | null = null;

/**
 * Initialize all workers
 */
async function initializeWorkers(): Promise<void> {
  console.log('[Worker] Initializing SLA workers...');

  // SLA Monitoring Worker
  slaMonitoringWorker = new Worker<SLAMonitoringJobData>(
    QueueNames.SLA_MONITORING,
    async (job: Job<SLAMonitoringJobData>) => {
      return await slaMonitoringJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.slaMonitoring,
    }
  );

  // SLA Calculation Worker
  slaCalculationWorker = new Worker<SLACalculationJobData>(
    QueueNames.SLA_CALCULATION,
    async (job: Job<SLACalculationJobData>) => {
      return await slaCalculationJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.slaCalculation,
    }
  );

  // SLA Breach Notification Worker
  slaBreachNotificationWorker = new Worker<SLABreachNotificationJobData>(
    QueueNames.SLA_BREACH_NOTIFICATION,
    async (job: Job<SLABreachNotificationJobData>) => {
      return await slaBreachNotificationJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.slaBreachNotification,
    }
  );

  // SLA Warning Notification Worker
  slaWarningNotificationWorker = new Worker<SLAWarningNotificationJobData>(
    QueueNames.SLA_WARNING_NOTIFICATION,
    async (job: Job<SLAWarningNotificationJobData>) => {
      return await slaWarningNotificationJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.slaWarningNotification,
    }
  );

  // SLA Compliance Report Worker
  slaComplianceReportWorker = new Worker<SLAComplianceReportJobData>(
    QueueNames.SLA_COMPLIANCE_REPORT,
    async (job: Job<SLAComplianceReportJobData>) => {
      return await slaComplianceReportJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.slaComplianceReport,
    }
  );

  // Ticket Automation Worker
  ticketAutomationWorker = new Worker<TicketAutomationJobData>(
    QueueNames.TICKET_AUTOMATION,
    async (job: Job<TicketAutomationJobData>) => {
      return await ticketAutomationJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.ticketAutomation,
    }
  );

  // Escalation Check Worker
  escalationCheckWorker = new Worker<EscalationCheckJobData>(
    QueueNames.ESCALATION_CHECK,
    async (job: Job<EscalationCheckJobData>) => {
      return await escalationCheckJob(job);
    },
    {
      connection: queueConfig.connection as any,
      concurrency: queueConfig.concurrency.escalationCheck,
    }
  );

  // Add event handlers for each worker
  setupWorkerEventHandlers(slaMonitoringWorker, QueueNames.SLA_MONITORING);
  setupWorkerEventHandlers(slaCalculationWorker, QueueNames.SLA_CALCULATION);
  setupWorkerEventHandlers(slaBreachNotificationWorker, QueueNames.SLA_BREACH_NOTIFICATION);
  setupWorkerEventHandlers(slaWarningNotificationWorker, QueueNames.SLA_WARNING_NOTIFICATION);
  setupWorkerEventHandlers(slaComplianceReportWorker, QueueNames.SLA_COMPLIANCE_REPORT);
  setupWorkerEventHandlers(ticketAutomationWorker, QueueNames.TICKET_AUTOMATION);
  setupWorkerEventHandlers(escalationCheckWorker, QueueNames.ESCALATION_CHECK);

  console.log('[Worker] All workers initialized successfully');
}

/**
 * Setup event handlers for a worker
 */
function setupWorkerEventHandlers(worker: Worker, queueName: string): void {
  worker.on('completed', (job: Job) => {
    console.log(`[Worker] Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    console.error(`[Worker] Job ${job?.id} failed in queue ${queueName}:`, error.message);
  });

  worker.on('error', (error: Error) => {
    console.error(`[Worker] Error in queue ${queueName}:`, error);
  });

  worker.on('ready', () => {
    console.log(`[Worker] Worker for queue ${queueName} is ready`);
  });
}

/**
 * Schedule SLA monitoring job to run periodically
 */
function scheduleMonitoringJob(): void {
  const checkIntervalMinutes = parseInt(process.env.SLA_CHECK_INTERVAL_MINUTES || '1', 10);
  const intervalMs = checkIntervalMinutes * 60 * 1000;

  console.log(`[Worker] Scheduling SLA monitoring job every ${checkIntervalMinutes} minute(s)`);

  // Initial run
  scheduleNextMonitoringJob();

  // Schedule periodic runs
  monitoringInterval = setInterval(() => {
    scheduleNextMonitoringJob();
  }, intervalMs);
}

/**
 * Schedule next monitoring job
 */
async function scheduleNextMonitoringJob(): Promise<void> {
  try {
    const { slaMonitoringQueue } = await import('./queues/sla.queue');

    await slaMonitoringQueue.add(
      'sla-monitoring',
      {
        jobId: `sla-monitoring-${Date.now()}`,
        timestamp: new Date(),
        checkIntervalMinutes: parseInt(process.env.SLA_CHECK_INTERVAL_MINUTES || '1', 10),
      },
      {
        jobId: `sla-monitoring-${Date.now()}`,
        priority: 5,
      }
    );

    console.log(`[Worker] SLA monitoring job scheduled at ${new Date().toISOString()}`);
  } catch (error: any) {
    console.error('[Worker] Failed to schedule monitoring job:', error);
  }
}

/**
 * Schedule escalation check job
 */
function scheduleEscalationCheckJob(): void {
  const checkIntervalMinutes = parseInt(process.env.ESCALATION_CHECK_INTERVAL_MINUTES || '5', 10);
  const intervalMs = checkIntervalMinutes * 60 * 1000;

  console.log(`[Worker] Scheduling escalation check job every ${checkIntervalMinutes} minute(s)`);

  // Initial run
  scheduleNextEscalationCheckJob();

  // Schedule periodic runs
  escalationCheckInterval = setInterval(() => {
    scheduleNextEscalationCheckJob();
  }, intervalMs);
}

/**
 * Schedule next escalation check job
 */
async function scheduleNextEscalationCheckJob(): Promise<void> {
  try {
    const { escalationCheckQueue } = await import('./queues/ticket.queue');

    await escalationCheckQueue.add(
      'escalation-check',
      {
        jobId: `escalation-check-${Date.now()}`,
        timestamp: new Date(),
        checkType: 'periodic',
      },
      {
        jobId: `escalation-check-${Date.now()}`,
        priority: 3,
      }
    );

    console.log(`[Worker] Escalation check job scheduled at ${new Date().toISOString()}`);
  } catch (error: any) {
    console.error('[Worker] Failed to schedule escalation check job:', error);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Worker] Received ${signal}, initiating graceful shutdown...`);

  // Clear monitoring intervals
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  if (escalationCheckInterval) {
    clearInterval(escalationCheckInterval);
    escalationCheckInterval = null;
  }

  // Close all workers
  const workers = [
    slaMonitoringWorker,
    slaCalculationWorker,
    slaBreachNotificationWorker,
    slaWarningNotificationWorker,
    slaComplianceReportWorker,
    ticketAutomationWorker,
    escalationCheckWorker,
  ].filter((w): w is Worker => w !== null);

  console.log(`[Worker] Closing ${workers.length} worker(s)...`);

  await Promise.all(
    workers.map(async (worker) => {
      await worker.close();
      console.log(`[Worker] Worker closed: ${worker.name}`);
    })
  );

  // Close Prisma connection
  await prisma.$disconnect();
  console.log('[Worker] Prisma connection closed');

  console.log('[Worker] Graceful shutdown complete');
  process.exit(0);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log('[Worker] Starting NixFlow SLA Worker Service...');
    console.log('[Worker] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? '***' : 'not set',
      REDIS_URL: process.env.REDIS_URL ? '***' : 'not set',
      SLA_CHECK_INTERVAL_MINUTES: process.env.SLA_CHECK_INTERVAL_MINUTES || '1',
      ESCALATION_CHECK_INTERVAL_MINUTES: process.env.ESCALATION_CHECK_INTERVAL_MINUTES || '5',
    });

    // Initialize event bus
    getEventBus({
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      enableLogging: true,
    });
    console.log('[Worker] EventBus initialized');

    // Test database connection
    await prisma.$connect();
    console.log('[Worker] Database connection established');

    // Initialize workers
    await initializeWorkers();

    // Schedule monitoring job
    scheduleMonitoringJob();

    // Schedule escalation check job
    scheduleEscalationCheckJob();

    console.log('[Worker] Worker service started successfully');
    console.log('[Worker] Press Ctrl+C to stop');
  } catch (error: any) {
    console.error('[Worker] Failed to start worker service:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[Worker] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('[Worker] Unhandled rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the worker service
main();
