/**
 * SLA Monitoring Job Processor
 * 
 * This job runs periodically to check SLA compliance for all active tickets,
 * update SLA metrics, and trigger notifications for breaches and warnings.
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SLAMonitoringJobData, WorkerJobResult, WorkerJobStatus } from '../types';
import { slaBreachNotificationQueue } from '../queues/sla.queue';
import { slaWarningNotificationQueue } from '../queues/sla.queue';
import { SLAStatus } from '../../../backend/src/types/sla.types';

const prisma = new PrismaClient();

/**
 * SLA Monitoring Job Processor
 * 
 * Queries all active tickets with SLA metrics and checks their compliance status.
 * Processes tickets in batches to avoid memory issues.
 */
export async function slaMonitoringJob(
  job: Job<SLAMonitoringJobData>
): Promise<WorkerJobResult> {
  const startTime = Date.now();
  const { jobId, timestamp, ticketIds, options } = job.data;

  console.log(`[SLA Monitoring] Starting job ${jobId} at ${new Date(timestamp).toISOString()}`);

  try {
    const results = {
      processed: 0,
      withinSLA: 0,
      warning: 0,
      breached: 0,
      newBreaches: 0,
      newWarnings: 0,
      errors: [] as string[],
    };

    // Determine which tickets to process
    let ticketsToProcess: number[];
    if (ticketIds && ticketIds.length > 0) {
      ticketsToProcess = ticketIds;
    } else {
      // Get all active tickets with SLA metrics
      const activeTickets = await prisma.sLAMetric.findMany({
        where: {
          ticket: {
            status: {
              notIn: ['Completed', 'Closed', 'Rejected'],
            },
          },
        },
        select: {
          ticketId: true,
        },
      });
      ticketsToProcess = activeTickets.map((m: any) => m.ticketId);
    }

    console.log(`[SLA Monitoring] Processing ${ticketsToProcess.length} tickets`);

    // Process tickets in batches
    const batchSize = options?.maxTickets || 100;
    for (let i = 0; i < ticketsToProcess.length; i += batchSize) {
      const batch = ticketsToProcess.slice(i, i + batchSize);
      console.log(`[SLA Monitoring] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} tickets)`);

      for (const ticketId of batch) {
        try {
          const result = await processTicket(ticketId);
          results.processed++;
          results.withinSLA += result.withinSLA;
          results.warning += result.warning;
          results.breached += result.breached;
          results.newBreaches += result.newBreaches;
          results.newWarnings += result.newWarnings;
        } catch (error: any) {
          console.error(`[SLA Monitoring] Error processing ticket ${ticketId}:`, error.message);
          results.errors.push(`Ticket ${ticketId}: ${error.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[SLA Monitoring] Job ${jobId} completed in ${duration}ms`);
    console.log(`[SLA Monitoring] Results:`, results);

    return {
      jobId,
      status: WorkerJobStatus.Completed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      result: results,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SLA Monitoring] Job ${jobId} failed:`, error);

    return {
      jobId,
      status: WorkerJobStatus.Failed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Process a single ticket for SLA compliance
 */
async function processTicket(ticketId: number): Promise<{
  withinSLA: number;
  warning: number;
  breached: number;
  newBreaches: number;
  newWarnings: number;
}> {
  // Get ticket with SLA metric
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      slaMetric: true,
      assignee: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!ticket || !ticket.slaMetric) {
    return { withinSLA: 0, warning: 0, breached: 0, newBreaches: 0, newWarnings: 0 };
  }

  const metric = ticket.slaMetric;
  const previousStatus = metric.status;

  // Calculate current SLA status
  const now = new Date();
  const currentAgeMins = Math.floor(
    (now.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
  );

  let newStatus: SLAStatus = SLAStatus.WithinSLA;
  let newBreaches = 0;
  let newWarnings = 0;

  // Check response time SLA
  if (!metric.firstResponseAt) {
    const warningTimeMins = Math.floor(metric.targetResponseTimeMins * 0.8);
    if (currentAgeMins > metric.targetResponseTimeMins) {
      newStatus = SLAStatus.Breached;
      // Check if breach already exists
      const existingBreach = await prisma.sLABreach.findFirst({
        where: {
          slaMetricId: metric.id,
          breachType: 'ResponseTime',
          status: 'Open',
        },
      });

      if (!existingBreach) {
        await prisma.sLABreach.create({
          data: {
            ticketId: ticket.id,
            slaMetricId: metric.id,
            slaPolicyId: metric.slaPolicyId,
            breachType: 'ResponseTime',
            actualTimeMins: currentAgeMins,
            targetTimeMins: metric.targetResponseTimeMins,
            overageMins: currentAgeMins - metric.targetResponseTimeMins,
          },
        });
        newBreaches++;

        // Queue breach notification
        await queueBreachNotification(ticket, metric, 'ResponseTime', currentAgeMins);
      }
    } else if (currentAgeMins >= warningTimeMins) {
      newStatus = SLAStatus.Warning;
    }
  }
  // Check resolution time SLA
  else if (!metric.resolvedAt) {
    const warningTimeMins = Math.floor(metric.targetResolutionTimeMins * 0.8);
    if (currentAgeMins > metric.targetResolutionTimeMins) {
      newStatus = SLAStatus.Breached;
      // Check if breach already exists
      const existingBreach = await prisma.sLABreach.findFirst({
        where: {
          slaMetricId: metric.id,
          breachType: 'ResolutionTime',
          status: 'Open',
        },
      });

      if (!existingBreach) {
        await prisma.sLABreach.create({
          data: {
            ticketId: ticket.id,
            slaMetricId: metric.id,
            slaPolicyId: metric.slaPolicyId,
            breachType: 'ResolutionTime',
            actualTimeMins: currentAgeMins,
            targetTimeMins: metric.targetResolutionTimeMins,
            overageMins: currentAgeMins - metric.targetResolutionTimeMins,
          },
        });
        newBreaches++;

        // Queue breach notification
        await queueBreachNotification(ticket, metric, 'ResolutionTime', currentAgeMins);
      }
    } else if (currentAgeMins >= warningTimeMins) {
      newStatus = SLAStatus.Warning;
    }
  }

  // Update metric status if changed
  if (newStatus !== previousStatus) {
    await prisma.sLAMetric.update({
      where: { id: metric.id },
      data: { status: newStatus },
    });

    // Queue warning notification if status changed to Warning
    if (newStatus === SLAStatus.Warning && previousStatus !== SLAStatus.Warning) {
      newWarnings++;
      await queueWarningNotification(ticket, metric, currentAgeMins);
    }
  }

  // Return statistics
  return {
    withinSLA: newStatus === SLAStatus.WithinSLA ? 1 : 0,
    warning: newStatus === SLAStatus.Warning ? 1 : 0,
    breached: newStatus === SLAStatus.Breached ? 1 : 0,
    newBreaches,
    newWarnings,
  };
}

/**
 * Queue a breach notification job
 */
async function queueBreachNotification(
  ticket: any,
  metric: any,
  breachType: string,
  actualTimeMins: number
): Promise<void> {
  const slaPolicy = await prisma.sLAPolicy.findUnique({
    where: { id: metric.slaPolicyId },
  });

  if (!slaPolicy) return;

  const targetTimeMins =
    breachType === 'ResponseTime'
      ? metric.targetResponseTimeMins
      : metric.targetResolutionTimeMins;

  // Get manager email if available
  let managerEmail: string | undefined;
  let managerId: number | undefined;
  if (ticket.assignee) {
    const manager = await prisma.user.findFirst({
      where: { role: 'Manager' },
      select: { id: true, email: true },
    });
    if (manager) {
      managerEmail = manager.email;
      managerId = manager.id;
    }
  }

  await slaBreachNotificationQueue.add(
    'sla-breach-notification',
    {
      jobId: `breach-${ticket.id}-${Date.now()}`,
      timestamp: new Date(),
      breachId: 0, // Will be set by the job
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      ticketIdString: ticket.ticketId,
      breachType: breachType as any,
      overageMins: actualTimeMins - targetTimeMins,
      slaPolicyName: slaPolicy.name,
      slaPolicyId: slaPolicy.id,
      assigneeEmail: ticket.assignee?.email,
      assigneeId: ticket.assignee?.id,
      managerEmail,
      managerId,
      notificationChannels: ['email'],
      priority: 'high',
    },
    {
      priority: 10,
    }
  );
}

/**
 * Queue a warning notification job
 */
async function queueWarningNotification(
  ticket: any,
  metric: any,
  currentAgeMins: number
): Promise<void> {
  const slaPolicy = await prisma.sLAPolicy.findUnique({
    where: { id: metric.slaPolicyId },
  });

  if (!slaPolicy) return;

  const targetTimeMins = !metric.firstResponseAt
    ? metric.targetResponseTimeMins
    : metric.targetResolutionTimeMins;

  const remainingMins = targetTimeMins - currentAgeMins;

  await slaWarningNotificationQueue.add(
    'sla-warning-notification',
    {
      jobId: `warning-${ticket.id}-${Date.now()}`,
      timestamp: new Date(),
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      ticketIdString: ticket.ticketId,
      warningType: !metric.firstResponseAt ? 'response_time' : 'resolution_time',
      remainingMins,
      slaPolicyName: slaPolicy.name,
      slaPolicyId: slaPolicy.id,
      assigneeEmail: ticket.assignee?.email,
      assigneeId: ticket.assignee?.id,
      notificationChannels: ['email'],
    },
    {
      priority: 5,
    }
  );
}
