/**
 * Ticket Queue - NixFlow Event-Driven Architecture
 * 
 * This file exports BullMQ queues for ticket-related jobs including
 * automation and escalation checks.
 */

import { Queue } from 'bullmq';
import { queueConfig, QueueNames } from '../config/queue.config';

/**
 * Ticket Automation Queue
 * Handles ticket automation jobs (prioritization, assignment)
 */
export const ticketAutomationQueue = new Queue(
  QueueNames.TICKET_AUTOMATION,
  {
    connection: queueConfig.connection as any,
    defaultJobOptions: queueConfig.defaultJobOptions,
  }
);

/**
 * Escalation Check Queue
 * Handles escalation check jobs
 */
export const escalationCheckQueue = new Queue(
  QueueNames.ESCALATION_CHECK,
  {
    connection: queueConfig.connection as any,
    defaultJobOptions: queueConfig.defaultJobOptions,
  }
);

/**
 * Close all ticket queues
 */
export async function closeTicketQueues(): Promise<void> {
  await Promise.all([
    ticketAutomationQueue.close(),
    escalationCheckQueue.close(),
  ]);
  console.log('[TicketQueue] All ticket queues closed');
}
