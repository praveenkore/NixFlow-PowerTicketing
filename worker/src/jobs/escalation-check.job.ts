/**
 * Escalation Check Job - NixFlow Event-Driven Architecture
 * 
 * This job monitors tickets for time-based escalation triggers
 * based on configured escalation rules.
 */

import { Job } from 'bullmq';
import { PrismaClient, Status } from '@prisma/client';
import { EscalationCheckJobData } from '../types';
import { getEventBus } from '../../../backend/src/events/event-bus';
import {
  TicketEventType,
  EscalationTriggeredEventData,
} from '../../../backend/src/events/event-types';

const prisma = new PrismaClient();

/**
 * Escalation Rules
 * In production, these would be loaded from database
 */
const ESCALATION_RULES = [
  {
    id: 'rule-6',
    name: 'Critical Approved Escalation',
    priority: 'Critical' as const,
    status: 'Approved' as Status,
    hours: 2,
    escalateToRole: 'Manager',
    isActive: true,
  },
  {
    id: 'rule-7',
    name: 'High Approved Escalation',
    priority: 'High' as const,
    status: 'Approved' as Status,
    hours: 8,
    escalateToRole: 'Manager',
    isActive: true,
  },
  {
    id: 'rule-8',
    name: 'Critical InProgress Escalation',
    priority: 'Critical' as const,
    status: 'InProgress' as Status,
    hours: 24,
    escalateToRole: 'Director',
    isActive: true,
  },
];

/**
 * Escalation Check Job Handler
 * 
 * @param job - BullMQ job containing escalation check data
 * @returns Job result with details of escalated tickets
 */
export async function escalationCheckJob(job: Job<EscalationCheckJobData>) {
  const { checkType, ticketIds, options } = job.data;

  console.log(`[EscalationCheckJob] Processing job ${job.id} (${checkType})`);

  try {
    let ticketsToCheck: any[] = [];

    // Get tickets to check based on job type
    if (ticketIds && ticketIds.length > 0) {
      // Check specific tickets
      ticketsToCheck = await prisma.ticket.findMany({
        where: {
          id: { in: ticketIds },
          ...(options?.includeResolved ? {} : { NOT: { status: 'Completed' as Status } }),
          ...(options?.includeClosed ? {} : { NOT: { status: 'Closed' as Status } }),
        },
        include: {
          historyLogs: true,
          assignee: { select: { id: true, name: true, email: true, role: true } },
        },
        take: options?.maxTickets || 100,
      });
    } else {
      // Check all eligible tickets
      const eligibleStatuses = ESCALATION_RULES.map((rule) => rule.status);
      const eligiblePriorities = ESCALATION_RULES.map((rule) => rule.priority);

      ticketsToCheck = await prisma.ticket.findMany({
        where: {
          status: { in: eligibleStatuses },
          priority: { in: eligiblePriorities },
          ...(options?.includeResolved ? {} : { NOT: { status: 'Completed' as Status } }),
          ...(options?.includeClosed ? {} : { NOT: { status: 'Closed' as Status } }),
        },
        include: {
          historyLogs: true,
          assignee: { select: { id: true, name: true, email: true, role: true } },
        },
        take: options?.maxTickets || 100,
      });
    }

    console.log(`[EscalationCheckJob] Checking ${ticketsToCheck.length} ticket(s) for escalation`);

    const escalatedTickets: any[] = [];

    // Check each ticket against escalation rules
    for (const ticket of ticketsToCheck) {
      const escalationResult = await checkTicketForEscalation(ticket);
      if (escalationResult.escalated) {
        escalatedTickets.push(escalationResult.ticket);
      }
    }

    console.log(`[EscalationCheckJob] Escalated ${escalatedTickets.length} ticket(s)`);

    return {
      success: true,
      checkType,
      ticketsChecked: ticketsToCheck.length,
      ticketsEscalated: escalatedTickets.length,
      escalatedTickets,
    };
  } catch (error: any) {
    console.error(`[EscalationCheckJob] Error processing job ${job.id}:`, error);
    throw error;
  }
}

/**
 * Check a single ticket for escalation
 * 
 * @param ticket - The ticket to check
 * @returns Result indicating if ticket was escalated
 */
async function checkTicketForEscalation(ticket: any): Promise<{
  escalated: boolean;
  ticket?: any;
}> {
  for (const rule of ESCALATION_RULES) {
    if (!rule.isActive) continue;

    if (ticket.priority === rule.priority && ticket.status === rule.status) {
      // Find when ticket entered this status
      const statusLog = ticket.historyLogs
        .slice()
        .reverse()
        .find((log: any) => log.action === 'Status Change' && log.details?.includes(rule.status));

      const timeEnteredStatus = statusLog ? statusLog.timestamp : ticket.createdAt;
      const hoursInStatus = (new Date().getTime() - timeEnteredStatus.getTime()) / (1000 * 60 * 60);

      if (hoursInStatus > rule.hours) {
        // Escalate ticket
        const escalationResult = await escalateTicket(ticket, rule, hoursInStatus);
        return {
          escalated: true,
          ticket: escalationResult,
        };
      }
    }
  }

  return { escalated: false };
}

/**
 * Escalate a ticket based on a rule
 * 
 * @param ticket - The ticket to escalate
 * @param rule - The escalation rule
 * @param hoursInStatus - How long the ticket has been in the current status
 * @returns Updated ticket
 */
async function escalateTicket(ticket: any, rule: any, hoursInStatus: number): Promise<any> {
  const usersInRole = await prisma.user.findMany({
    where: { role: rule.escalateToRole as any },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (usersInRole.length === 0) {
    console.warn(`[EscalationCheckJob] No users found for role: ${rule.escalateToRole}`);
    return ticket;
  }

  const escalationAssignee = usersInRole[0];

  // Check if already escalated for this rule
  const alreadyEscalated = ticket.historyLogs.some((h: any) =>
    h.action === 'Escalated' && h.details?.includes(rule.name)
  );

  if (!alreadyEscalated) {
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assigneeId: escalationAssignee.id,
        historyLogs: {
          create: {
            action: 'Escalated',
            details: `Escalated to ${escalationAssignee.name} based on rule: "${rule.name}" (${hoursInStatus.toFixed(1)}h in ${rule.status})`,
            userId: 0,
          },
        },
      },
      include: {
        requestor: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
        historyLogs: true,
      },
    });

    console.log(
      `[EscalationCheckJob] Escalated ticket ${ticket.ticketId} to ${escalationAssignee.name} (${rule.name})`
    );

    // Emit escalation triggered event
    try {
      const eventBus = getEventBus();
      if (eventBus.getConnectionStatus()) {
        await eventBus.emit(
          TicketEventType.TICKET_ESCALATED,
          {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketId,
            escalatedTo: escalationAssignee.id,
            escalatedFrom: ticket.assigneeId,
            rule: rule.name,
            reason: `${hoursInStatus.toFixed(1)} hours in ${rule.status} exceeded threshold of ${rule.hours} hours`,
          } as EscalationTriggeredEventData,
          { userId: 0, source: 'worker' }
        );
      }
    } catch (eventError: any) {
      console.error(`[EscalationCheckJob] Failed to emit escalation event:`, eventError.message);
    }

    return updatedTicket;
  }

  return ticket;
}
