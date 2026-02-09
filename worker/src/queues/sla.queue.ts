/**
 * BullMQ Queue Setup for NixFlow Worker Service
 * 
 * This file creates and exports all SLA-related queues for background job processing.
 */

import { Queue } from 'bullmq';
import { queueConfig, QueueNames } from '../config/queue.config';

/**
 * SLA Monitoring Queue
 * Processes periodic SLA compliance checks for all active tickets
 */
export const slaMonitoringQueue = new Queue(QueueNames.SLA_MONITORING, {
  connection: queueConfig.connection,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

/**
 * SLA Calculation Queue
 * Processes SLA metric calculations for ticket events (created, commented, approved, resolved)
 */
export const slaCalculationQueue = new Queue(QueueNames.SLA_CALCULATION, {
  connection: queueConfig.connection,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

/**
 * SLA Breach Notification Queue
 * Processes notifications when SLA breaches are detected
 */
export const slaBreachNotificationQueue = new Queue(QueueNames.SLA_BREACH_NOTIFICATION, {
  connection: queueConfig.connection,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

/**
 * SLA Warning Notification Queue
 * Processes notifications when tickets are approaching SLA breach thresholds
 */
export const slaWarningNotificationQueue = new Queue(QueueNames.SLA_WARNING_NOTIFICATION, {
  connection: queueConfig.connection,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

/**
 * SLA Compliance Report Queue
 * Processes generation and delivery of SLA compliance reports
 */
export const slaComplianceReportQueue = new Queue(QueueNames.SLA_COMPLIANCE_REPORT, {
  connection: queueConfig.connection,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

/**
 * Close all queues gracefully
 * Call this when shutting down the worker service
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    slaMonitoringQueue.close(),
    slaCalculationQueue.close(),
    slaBreachNotificationQueue.close(),
    slaWarningNotificationQueue.close(),
    slaComplianceReportQueue.close(),
  ]);
}

/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats(): Promise<Record<string, any>> {
  const [monitoring, calculation, breach, warning, report] = await Promise.all([
    slaMonitoringQueue.getJobCounts(),
    slaCalculationQueue.getJobCounts(),
    slaBreachNotificationQueue.getJobCounts(),
    slaWarningNotificationQueue.getJobCounts(),
    slaComplianceReportQueue.getJobCounts(),
  ]);

  return {
    slaMonitoring: monitoring,
    slaCalculation: calculation,
    slaBreachNotification: breach,
    slaWarningNotification: warning,
    slaComplianceReport: report,
  };
}
