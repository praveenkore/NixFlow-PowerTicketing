/**
 * SLA Calculation Job Processor
 * 
 * This job processes SLA metric calculations for ticket events such as
 * ticket creation, first comment, approval completion, and resolution.
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SLACalculationJobData, WorkerJobResult, WorkerJobStatus } from '../types';
import { SLAStatus, SLABreachType } from '../../../backend/src/types/sla.types';

const prisma = new PrismaClient();

/**
 * SLA Calculation Job Processor
 * 
 * Handles different event types and performs the appropriate SLA calculations.
 */
export async function slaCalculationJob(
  job: Job<SLACalculationJobData>
): Promise<WorkerJobResult> {
  const startTime = Date.now();
  const { jobId, timestamp, ticketId, slaPolicyId, calculationType, eventData } = job.data;

  console.log(
    `[SLA Calculation] Starting job ${jobId} for ticket ${ticketId}, type: ${calculationType}`
  );

  try {
    let result: any = null;

    switch (calculationType) {
      case 'initial':
        result = await handleInitialCalculation(ticketId, slaPolicyId);
        break;
      case 'update':
        if (eventData?.eventType === 'first_response') {
          result = await handleFirstResponse(ticketId, eventData.eventTimestamp);
        } else if (eventData?.eventType === 'approval_complete') {
          result = await handleApprovalComplete(ticketId, eventData.eventTimestamp, (eventData as any).stageIndex);
        } else if (eventData?.eventType === 'resolution') {
          result = await handleResolution(ticketId, eventData.eventTimestamp);
        } else {
          throw new Error(`Unknown event type: ${eventData?.eventType}`);
        }
        break;
      case 'final':
        result = await handleFinalCalculation(ticketId);
        break;
      default:
        throw new Error(`Unknown calculation type: ${calculationType}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[SLA Calculation] Job ${jobId} completed in ${duration}ms`);

    return {
      jobId,
      status: WorkerJobStatus.Completed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      result,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SLA Calculation] Job ${jobId} failed:`, error);

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
 * Handle initial SLA metric creation for a new ticket
 */
async function handleInitialCalculation(
  ticketId: number,
  slaPolicyId: number
): Promise<any> {
  console.log(`[SLA Calculation] Creating initial metric for ticket ${ticketId}`);

  // Get ticket details
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      createdAt: true,
      category: true,
      priority: true,
      workflowId: true,
    },
  });

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // Check if metric already exists
  const existingMetric = await prisma.sLAMetric.findUnique({
    where: { ticketId },
  });

  if (existingMetric) {
    console.log(`[SLA Calculation] Metric already exists for ticket ${ticketId}`);
    return existingMetric;
  }

  // Get SLA policy
  const policy = await prisma.sLAPolicy.findUnique({
    where: { id: slaPolicyId },
  });

  if (!policy) {
    throw new Error(`SLA Policy ${slaPolicyId} not found`);
  }

  // Create SLA metric
  const metric = await prisma.sLAMetric.create({
    data: {
      ticketId,
      slaPolicyId,
      ticketCreatedAt: ticket.createdAt,
      targetResponseTimeMins: policy.responseTimeMins,
      targetResolutionTimeMins: policy.resolutionTimeMins,
      targetApprovalTimeMins: policy.approvalTimeMins,
      status: SLAStatus.WithinSLA,
    },
  });

  console.log(`[SLA Calculation] Created metric ${metric.id} for ticket ${ticketId}`);
  return metric;
}

/**
 * Handle first response time calculation
 */
async function handleFirstResponse(ticketId: number, firstResponseAt: Date): Promise<any> {
  console.log(`[SLA Calculation] Processing first response for ticket ${ticketId}`);

  // Get existing metric
  const metric = await prisma.sLAMetric.findUnique({
    where: { ticketId },
    include: {
      slaPolicy: true,
    },
  });

  if (!metric) {
    throw new Error(`SLA Metric not found for ticket ${ticketId}`);
  }

  // Calculate response time in minutes
  const responseTimeMins = Math.floor(
    (firstResponseAt.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
  );

  // Calculate SLA status
  const warningTimeMins = Math.floor(metric.targetResponseTimeMins * metric.slaPolicy.warningThreshold);
  let status: SLAStatus = SLAStatus.WithinSLA;
  if (responseTimeMins > metric.targetResponseTimeMins) {
    status = SLAStatus.Breached;
  } else if (responseTimeMins >= warningTimeMins) {
    status = SLAStatus.Warning;
  }

  // Update metric
  const updatedMetric = await prisma.sLAMetric.update({
    where: { id: metric.id },
    data: {
      firstResponseAt,
      responseTimeMins,
      status,
    },
  });

  // Create breach if needed
  if (status === SLAStatus.Breached) {
    await createBreachIfNeeded(
      metric.id,
      ticketId,
      metric.slaPolicyId,
      SLABreachType.ResponseTime,
      responseTimeMins,
      metric.targetResponseTimeMins
    );
  }

  console.log(`[SLA Calculation] Updated first response time for ticket ${ticketId}: ${responseTimeMins} mins`);
  return updatedMetric;
}

/**
 * Handle approval completion time calculation
 */
async function handleApprovalComplete(
  ticketId: number,
  approvalCompletedAt: Date,
  stageIndex?: number
): Promise<any> {
  console.log(`[SLA Calculation] Processing approval complete for ticket ${ticketId}`);

  // Get existing metric
  const metric = await prisma.sLAMetric.findUnique({
    where: { ticketId },
    include: {
      slaPolicy: true,
    },
  });

  if (!metric) {
    throw new Error(`SLA Metric not found for ticket ${ticketId}`);
  }

  if (!metric.targetApprovalTimeMins) {
    console.log(`[SLA Calculation] No approval time target for ticket ${ticketId}`);
    return metric;
  }

  // Calculate approval time in minutes
  const approvalTimeMins = Math.floor(
    (approvalCompletedAt.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
  );

  // Calculate SLA status
  const warningTimeMins = Math.floor(metric.targetApprovalTimeMins * metric.slaPolicy.warningThreshold);
  let status: SLAStatus = SLAStatus.WithinSLA;
  if (approvalTimeMins > metric.targetApprovalTimeMins) {
    status = SLAStatus.Breached;
  } else if (approvalTimeMins >= warningTimeMins) {
    status = SLAStatus.Warning;
  }

  // Update metric
  const updatedMetric = await prisma.sLAMetric.update({
    where: { id: metric.id },
    data: {
      approvalCompletedAt,
      approvalTimeMins,
      status,
    },
  });

  // Create breach if needed
  if (status === SLAStatus.Breached) {
    await createBreachIfNeeded(
      metric.id,
      ticketId,
      metric.slaPolicyId,
      SLABreachType.ApprovalTime,
      approvalTimeMins,
      metric.targetApprovalTimeMins,
      stageIndex
    );
  }

  console.log(`[SLA Calculation] Updated approval time for ticket ${ticketId}: ${approvalTimeMins} mins`);
  return updatedMetric;
}

/**
 * Handle resolution time calculation
 */
async function handleResolution(ticketId: number, resolvedAt: Date): Promise<any> {
  console.log(`[SLA Calculation] Processing resolution for ticket ${ticketId}`);

  // Get existing metric
  const metric = await prisma.sLAMetric.findUnique({
    where: { ticketId },
    include: {
      slaPolicy: true,
    },
  });

  if (!metric) {
    throw new Error(`SLA Metric not found for ticket ${ticketId}`);
  }

  // Calculate resolution time in minutes
  const resolutionTimeMins = Math.floor(
    (resolvedAt.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
  );

  // Calculate SLA status
  const warningTimeMins = Math.floor(metric.targetResolutionTimeMins * metric.slaPolicy.warningThreshold);
  let status: SLAStatus = SLAStatus.WithinSLA;
  if (resolutionTimeMins > metric.targetResolutionTimeMins) {
    status = SLAStatus.Breached;
  } else if (resolutionTimeMins >= warningTimeMins) {
    status = SLAStatus.Warning;
  }

  // Update metric
  const updatedMetric = await prisma.sLAMetric.update({
    where: { id: metric.id },
    data: {
      resolvedAt,
      resolutionTimeMins,
      status,
    },
  });

  // Create breach if needed
  if (status === SLAStatus.Breached) {
    await createBreachIfNeeded(
      metric.id,
      ticketId,
      metric.slaPolicyId,
      SLABreachType.ResolutionTime,
      resolutionTimeMins,
      metric.targetResolutionTimeMins
    );
  }

  console.log(`[SLA Calculation] Updated resolution time for ticket ${ticketId}: ${resolutionTimeMins} mins`);
  return updatedMetric;
}

/**
 * Handle final SLA calculation when ticket is closed
 */
async function handleFinalCalculation(ticketId: number): Promise<any> {
  console.log(`[SLA Calculation] Processing final calculation for ticket ${ticketId}`);

  // Get metric with all related data
  const metric = await prisma.sLAMetric.findUnique({
    where: { ticketId },
    include: {
      slaPolicy: true,
      slaBreaches: true,
      ticket: {
        select: {
          id: true,
          ticketId: true,
          title: true,
          createdAt: true,
          status: true,
        },
      },
    },
  });

  if (!metric) {
    throw new Error(`SLA Metric not found for ticket ${ticketId}`);
  }

  // Calculate final statistics
  const result = {
    ticketId: metric.ticketId,
    ticketIdString: metric.ticket.ticketId,
    title: metric.ticket.title,
    slaPolicyId: metric.slaPolicyId,
    slaPolicyName: metric.slaPolicy.name,
    responseTimeMins: metric.responseTimeMins,
    targetResponseTimeMins: metric.targetResponseTimeMins,
    resolutionTimeMins: metric.resolutionTimeMins,
    targetResolutionTimeMins: metric.targetResolutionTimeMins,
    approvalTimeMins: metric.approvalTimeMins,
    targetApprovalTimeMins: metric.targetApprovalTimeMins,
    finalStatus: metric.status,
    totalBreaches: metric.slaBreaches.length,
    breaches: metric.slaBreaches.map((b: any) => ({
      type: b.breachType,
      actualTimeMins: b.actualTimeMins,
      targetTimeMins: b.targetTimeMins,
      overageMins: b.overageMins,
      status: b.status,
    })),
  };

  console.log(`[SLA Calculation] Final calculation complete for ticket ${ticketId}`);
  return result;
}

/**
 * Create SLA breach if one doesn't already exist for the same type and metric
 */
async function createBreachIfNeeded(
  slaMetricId: number,
  ticketId: number,
  slaPolicyId: number,
  breachType: SLABreachType,
  actualTimeMins: number,
  targetTimeMins: number,
  stageIndex?: number
): Promise<void> {
  // Find existing open breach for this type and metric
  const existingBreach = await prisma.sLABreach.findFirst({
    where: {
      slaMetricId,
      breachType,
      status: 'Open',
    },
  });

  // Only create new breach if one doesn't already exist
  if (!existingBreach) {
    await prisma.sLABreach.create({
      data: {
        ticketId,
        slaMetricId,
        slaPolicyId,
        breachType,
        actualTimeMins,
        targetTimeMins,
        overageMins: actualTimeMins - targetTimeMins,
        stageIndex,
      },
    });
    console.log(`[SLA Calculation] Created ${breachType} breach for ticket ${ticketId}`);
  }
}
