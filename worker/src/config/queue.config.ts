/**
 * BullMQ Queue Configuration for NixFlow Worker Service
 * 
 * This file contains configuration for all SLA-related queues including
 * connection options, job options, and queue names.
 */

import { QueueOptions, JobsOptions } from 'bullmq';

/**
 * Queue names for SLA-related jobs
 */
export enum QueueNames {
  SLA_MONITORING = 'sla-monitoring',
  SLA_CALCULATION = 'sla-calculation',
  SLA_BREACH_NOTIFICATION = 'sla-breach-notification',
  SLA_WARNING_NOTIFICATION = 'sla-warning-notification',
  SLA_COMPLIANCE_REPORT = 'sla-compliance-report',
  // Ticket-related queues
  TICKET_AUTOMATION = 'ticket-automation',
  ESCALATION_CHECK = 'escalation-check',
}

/**
 * Worker Queue Configuration Interface
 */
export interface WorkerQueueConfig {
  queueNames: QueueNames;
  connection: QueueOptions;
  defaultJobOptions: JobsOptions;
  concurrency: {
    slaMonitoring: number;
    slaCalculation: number;
    slaBreachNotification: number;
    slaWarningNotification: number;
    slaComplianceReport: number;
    ticketAutomation: number;
    escalationCheck: number;
  };
}

/**
 * Redis connection configuration
 * Reads from environment variables with defaults for development
 */
const getRedisConnection = (): any => {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      const match = redisUrl.match(/redis(?:s)?:\/\/([^:/]+)(?::(\d+))?/);
      if (match) {
        return {
          host: match[1],
          port: match[2] ? parseInt(match[2], 10) : 6379,
          maxRetriesPerRequest: null,
        };
      }
    } catch (e) {
      console.error('[QueueConfig] Redis URL parse error:', e);
    }
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
  };
};

/**
 * Default job options for all queues
 */
const defaultJobOptions: JobsOptions = {
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
    age: 24 * 3600, // Remove jobs older than 24 hours
  },
  removeOnFail: {
    count: 500, // Keep last 500 failed jobs for debugging
    age: 7 * 24 * 3600, // Remove failed jobs older than 7 days
  },
  attempts: 3, // Retry failed jobs up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Initial delay of 2 seconds
  },
};

/**
 * Complete queue configuration
 */
export const queueConfig: WorkerQueueConfig = {
  queueNames: QueueNames as any,
  connection: getRedisConnection(),
  defaultJobOptions,
  concurrency: {
    slaMonitoring: 1, // Only one monitoring job at a time
    slaCalculation: 5, // Process up to 5 calculations concurrently
    slaBreachNotification: 10, // Process up to 10 breach notifications concurrently
    slaWarningNotification: 10, // Process up to 10 warning notifications concurrently
    slaComplianceReport: 2, // Process up to 2 report generations concurrently
    ticketAutomation: 5, // Process up to 5 ticket automations concurrently
    escalationCheck: 1, // Only one escalation check at a time
  },
};
