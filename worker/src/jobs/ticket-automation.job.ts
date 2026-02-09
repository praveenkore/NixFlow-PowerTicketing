/**
 * Ticket Automation Job - NixFlow Event-Driven Architecture
 * 
 * This job applies automation rules (prioritization and assignment)
 * to tickets based on event triggers from the event bus.
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { TicketAutomationJobData } from '../types';
import { getEventBus } from '../../../backend/src/events/event-bus';
import {
  TicketEventType,
  AutomationEventType,
  PrioritizationAppliedEventData,
  AssignmentAppliedEventData,
} from '../../../backend/src/events/event-types';

const prisma = new PrismaClient();

/**
 * Prioritization Rules
 * In production, these would be loaded from database
 */
const PRIORITIZATION_RULES = [
  {
    id: 'rule-1',
    name: 'Urgent Keyword',
    keyword: 'urgent',
    priority: 'High' as const,
    isActive: true,
  },
  {
    id: 'rule-2',
    name: 'Outage Keywords',
    keyword: 'outage',
    priority: 'Critical' as const,
    isActive: true,
  },
  {
    id: 'rule-3',
    name: 'Down Keywords',
    keyword: 'down',
    priority: 'Critical' as const,
    isActive: true,
  },
];

/**
 * Assignment Rules
 * In production, these would be loaded from database
 */
const ASSIGNMENT_RULES = [
  {
    id: 'rule-4',
    name: 'Hardware Assignment',
    category: 'Hardware',
    role: 'HardwareEngineer',
    isActive: true,
  },
  {
    id: 'rule-5',
    name: 'Production Change Assignment',
    category: 'ProductionChange',
    role: 'Engineer',
    isActive: true,
  },
];

/**
 * Ticket Automation Job Handler
 * 
 * @param job - BullMQ job containing ticket automation data
 * @returns Job result with details of applied automations
 */
export async function ticketAutomationJob(job: Job<TicketAutomationJobData>) {
  const { ticketId, ticketNumber, automationType, triggerEvent, userId } = job.data;

  console.log(`[TicketAutomationJob] Processing job ${job.id} for ticket ${ticketNumber}`);

  try {
    // Get ticket with full details
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requestor: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
        workflow: { include: { stages: true } },
      },
    });

    if (!ticket) {
      console.error(`[TicketAutomationJob] Ticket with ID ${ticketId} not found`);
      throw new Error(`Ticket ${ticketId} not found`);
    }

    let modified = false;
    let updatedTicket = { ...ticket };
    const appliedRules: string[] = [];

    // Apply prioritization rules if requested
    if (automationType === 'prioritization' || automationType === 'both') {
      const prioritizationResult = await applyPrioritizationRules(updatedTicket);
      if (prioritizationResult.modified) {
        updatedTicket = prioritizationResult.ticket;
        modified = true;
        appliedRules.push(prioritizationResult.rule!);

        // Emit prioritization applied event
        try {
          const eventBus = getEventBus();
          if (eventBus.getConnectionStatus()) {
            await eventBus.emit(
              AutomationEventType.PRIORITIZATION_APPLIED,
              {
                ticketId,
                ticketNumber: ticket.ticketId,
                oldPriority: ticket.priority,
                newPriority: updatedTicket.priority,
                rule: prioritizationResult.rule,
                triggeredBy: triggerEvent || 'job',
              } as PrioritizationAppliedEventData,
              { userId, source: 'worker' }
            );
          }
        } catch (eventError: any) {
          console.error(`[TicketAutomationJob] Failed to emit prioritization event:`, eventError.message);
        }
      }
    }

    // Apply assignment rules if requested
    if (automationType === 'assignment' || automationType === 'both') {
      const assignmentResult = await applyAssignmentRules(updatedTicket);
      if (assignmentResult.modified) {
        updatedTicket = assignmentResult.ticket;
        modified = true;
        appliedRules.push(assignmentResult.rule!);

        // Emit assignment applied event
        try {
          const eventBus = getEventBus();
          if (eventBus.getConnectionStatus()) {
            await eventBus.emit(
              AutomationEventType.ASSIGNMENT_APPLIED,
              {
                ticketId,
                ticketNumber: ticket.ticketId,
                oldAssigneeId: ticket.assigneeId,
                newAssigneeId: updatedTicket.assigneeId,
                rule: assignmentResult.rule,
                triggeredBy: triggerEvent || 'job',
              } as AssignmentAppliedEventData,
              { userId, source: 'worker' }
            );
          }
        } catch (eventError: any) {
          console.error(`[TicketAutomationJob] Failed to emit assignment event:`, eventError.message);
        }
      }
    }

    // Save changes if any
    if (modified) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          priority: updatedTicket.priority,
          assigneeId: updatedTicket.assigneeId,
          historyLogs: {
            create: {
              action: 'Automated',
              details: `Automation rules applied: ${appliedRules.join(', ')}`,
              userId: 0, // System user
            },
          },
        },
      });

      console.log(`[TicketAutomationJob] Applied automations to ticket ${ticketNumber}: ${appliedRules.join(', ')}`);
    } else {
      console.log(`[TicketAutomationJob] No automation rules applied to ticket ${ticketNumber}`);
    }

    return {
      success: true,
      ticketId,
      ticketNumber,
      modified,
      appliedRules,
    };
  } catch (error: any) {
    console.error(`[TicketAutomationJob] Error processing job ${job.id}:`, error);
    throw error;
  }
}

/**
 * Apply prioritization rules to a ticket
 * 
 * @param ticket - The ticket to apply rules to
 * @returns Result indicating if ticket was modified
 */
async function applyPrioritizationRules(ticket: any): Promise<{
  modified: boolean;
  ticket: any;
  rule?: string;
}> {
  const content = `${ticket.title} ${ticket.description}`.toLowerCase();

  for (const rule of PRIORITIZATION_RULES) {
    if (!rule.isActive) continue;

    if (content.includes(rule.keyword.toLowerCase())) {
      if (ticket.priority !== rule.priority) {
        return {
          modified: true,
          ticket: { ...ticket, priority: rule.priority },
          rule: rule.name,
        };
      }
    }
  }

  return { modified: false, ticket };
}

/**
 * Apply assignment rules to a ticket
 * 
 * @param ticket - The ticket to apply rules to
 * @returns Result indicating if ticket was modified
 */
async function applyAssignmentRules(ticket: any): Promise<{
  modified: boolean;
  ticket: any;
  rule?: string;
}> {
  for (const rule of ASSIGNMENT_RULES) {
    if (!rule.isActive) continue;

    if (ticket.category === rule.category) {
      // Get users in role
      const usersInRole = await prisma.user.findMany({
        where: {
          role: rule.role as any,
          id: { not: 0 }, // Exclude system user
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (usersInRole.length > 0) {
        // Simple round-robin: use first user for now
        // In production, this would use the round-robin service
        const nextAssignee = usersInRole[0];

        if (nextAssignee && nextAssignee.id !== ticket.assigneeId) {
          return {
            modified: true,
            ticket: { ...ticket, assignee: nextAssignee, assigneeId: nextAssignee.id },
            rule: rule.name,
          };
        }
      }
    }
  }

  return { modified: false, ticket };
}
