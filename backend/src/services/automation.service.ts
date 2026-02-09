/**
 * Automation Service - NixFlow Event-Driven Architecture
 * 
 * This file implements the automation engine for ticket management,
 * including prioritization, assignment, and escalation rules.
 * 
 * The service is event-driven and reacts to ticket lifecycle events.
 */

import { PrismaClient } from '@prisma/client';
import { EventBus } from '../events/event-bus';
import {
  TicketEventType,
  AutomationEventType,
  TicketCreatedEventData,
  TicketUpdatedEventData,
  TicketStatusChangedEventData,
  PrioritizationAppliedEventData,
  AssignmentAppliedEventData,
  EscalationTriggeredEventData,
} from '../events/event-types';
import { RoundRobinService } from './round-robin.service';

/**
 * Automation Rule Types
 */
export interface PrioritizationRule {
  id: string;
  name: string;
  keyword: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  isActive: boolean;
}

export interface AssignmentRule {
  id: string;
  name: string;
  category: string;
  role: string;
  isActive: boolean;
}

export interface EscalationRule {
  id: string;
  name: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  hours: number;
  escalateToRole: string;
  newPriority?: 'Low' | 'Medium' | 'High' | 'Critical';
  isActive: boolean;
}

/**
 * Automation Service Class
 * Handles all automation logic for tickets
 */
export class AutomationService {
  private prisma: PrismaClient;
  private eventBus: EventBus;
  private roundRobinService: RoundRobinService;

  constructor(eventBus: EventBus, prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.eventBus = eventBus;
    this.roundRobinService = new RoundRobinService(this.prisma);
    this.initializeListeners();
  }

  /**
   * Initialize event listeners for ticket lifecycle events
   */
  private initializeListeners(): void {
    // Listen to ticket creation
    this.eventBus.on(TicketEventType.TICKET_CREATED, async (event) => {
      await this.handleTicketCreated(event.data as TicketCreatedEventData);
    });

    // Listen to ticket updates
    this.eventBus.on(TicketEventType.TICKET_UPDATED, async (event) => {
      await this.handleTicketUpdated(event.data as TicketUpdatedEventData);
    });

    // Listen to ticket status changes
    this.eventBus.on(TicketEventType.TICKET_STATUS_CHANGED, async (event) => {
      await this.handleTicketStatusChanged(event.data as TicketStatusChangedEventData);
    });
  }

  /**
   * Handle ticket created event
   */
  private async handleTicketCreated(data: TicketCreatedEventData): Promise<void> {
    try {
      // Apply automation rules to new ticket
      await this.applyAutomations(data.ticketId);
    } catch (error: any) {
      console.error(`[AutomationService] Failed to handle ticket created: ${error.message}`);
    }
  }

  /**
   * Handle ticket updated event
   */
  private async handleTicketUpdated(data: TicketUpdatedEventData): Promise<void> {
    try {
      // Re-apply automation rules on ticket update
      await this.applyAutomations(data.ticketId);
    } catch (error: any) {
      console.error(`[AutomationService] Failed to handle ticket updated: ${error.message}`);
    }
  }

  /**
   * Handle ticket status changed event
   */
  private async handleTicketStatusChanged(data: TicketStatusChangedEventData): Promise<void> {
    try {
      // Check for escalations when status changes
      await this.checkEscalations(data.ticketId);
    } catch (error: any) {
      console.error(`[AutomationService] Failed to handle ticket status changed: ${error.message}`);
    }
  }

  /**
   * Apply all automation rules to a ticket
   * 
   * @param ticketId - The ticket ID to apply rules to
   */
  async applyAutomations(ticketId: number): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requestor: { select: { id: true, name: true, email: true, role: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
        workflow: { include: { stages: true } },
      },
    });

    if (!ticket) {
      console.error(`[AutomationService] Ticket with ID ${ticketId} not found`);
      return;
    }

    let modified = false;
    let updatedTicket = { ...ticket };

    // 1. Apply prioritization rules
    const prioritizationResult = await this.applyPrioritizationRules(updatedTicket);
    if (prioritizationResult.modified) {
      updatedTicket = prioritizationResult.ticket;
      modified = true;

      // Emit prioritization applied event
      await this.eventBus.emit(
        AutomationEventType.PRIORITIZATION_APPLIED,
        {
          ticketId,
          ticketNumber: ticket.ticketId,
          oldPriority: ticket.priority,
          newPriority: updatedTicket.priority,
          rule: prioritizationResult.rule,
        } as PrioritizationAppliedEventData
      );
    }

    // 2. Apply assignment rules
    const assignmentResult = await this.applyAssignmentRules(updatedTicket);
    if (assignmentResult.modified) {
      updatedTicket = assignmentResult.ticket;
      modified = true;

      // Emit assignment applied event
      await this.eventBus.emit(
        AutomationEventType.ASSIGNMENT_APPLIED,
        {
          ticketId,
          ticketNumber: ticket.ticketId,
          oldAssigneeId: ticket.assigneeId,
          newAssigneeId: updatedTicket.assigneeId,
          rule: assignmentResult.rule,
        } as AssignmentAppliedEventData
      );
    }

    // Save changes if any
    if (modified) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          priority: updatedTicket.priority,
          assigneeId: updatedTicket.assigneeId,
          historyLogs: {
            create: {
              action: 'Automated',
              details: 'Automation rules applied',
              userId: 0, // System user
            },
          },
        },
      });
    }
  }

  /**
   * Apply prioritization rules to a ticket
   * 
   * @param ticket - The ticket to apply rules to
   * @returns Result indicating if ticket was modified
   */
  private async applyPrioritizationRules(ticket: any): Promise<{
    modified: boolean;
    ticket: any;
    rule?: string;
  }> {
    const prioritizationRules = await this.getPrioritizationRules();
    const content = `${ticket.title} ${ticket.description}`.toLowerCase();

    for (const rule of prioritizationRules) {
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
  private async applyAssignmentRules(ticket: any): Promise<{
    modified: boolean;
    ticket: any;
    rule?: string;
  }> {
    const assignmentRules = await this.getAssignmentRules();

    for (const rule of assignmentRules) {
      if (!rule.isActive) continue;

      if (ticket.category === rule.category) {
        const nextAssignee = await this.roundRobinService.getNextAssignee(rule.role);
        
        if (nextAssignee && nextAssignee.id !== ticket.assigneeId) {
          return {
            modified: true,
            ticket: { ...ticket, assignee: nextAssignee, assigneeId: nextAssignee.id },
            rule: rule.name,
          };
        }
      }
    }

    return { modified: false, ticket };
  }

  /**
   * Check for escalations on a ticket
   * 
   * @param ticketId - The ticket ID to check
   */
  private async checkEscalations(ticketId: number): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        historyLogs: true,
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!ticket) {
      console.error(`[AutomationService] Ticket with ID ${ticketId} not found`);
      return;
    }

    const escalationRules = await this.getEscalationRules();

    for (const rule of escalationRules) {
      if (!rule.isActive) continue;

      if (ticket.priority === rule.priority && ticket.status === rule.status) {
        const statusLog = ticket.historyLogs
          .slice()
          .reverse()
          .find(log => log.action === 'Status Change' && log.details?.includes(rule.status));

        const timeEnteredStatus = statusLog ? statusLog.timestamp : ticket.createdAt;
        const hoursInStatus = (new Date().getTime() - timeEnteredStatus.getTime()) / (1000 * 60 * 60);

        if (hoursInStatus > rule.hours) {
          await this.escalateTicket(ticket, rule);
        }
      }
    }
  }

  /**
   * Escalate a ticket based on a rule
   * 
   * @param ticket - The ticket to escalate
   * @param rule - The escalation rule
   */
  private async escalateTicket(ticket: any, rule: EscalationRule): Promise<void> {
    const usersInRole = await this.prisma.user.findMany({
      where: { role: rule.escalateToRole as any },
    });

    if (usersInRole.length > 0) {
      const escalationAssignee = usersInRole[0];

      // Check if already escalated for this rule
      const alreadyEscalated = ticket.historyLogs.some((h: any) => 
        h.action === 'Escalated' && h.details?.includes(rule.name)
      );

      if (!alreadyEscalated) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            assigneeId: escalationAssignee.id,
            priority: rule.newPriority || ticket.priority,
            historyLogs: {
              create: {
                action: 'Escalated',
                details: `Escalated to ${escalationAssignee.name} based on rule: "${rule.name}"`,
                userId: 0,
              },
            },
          },
        });

        // Emit escalation triggered event
        await this.eventBus.emit(
          TicketEventType.TICKET_ESCALATED,
          {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketId,
            escalatedTo: escalationAssignee.id,
            escalatedFrom: ticket.assigneeId,
            rule: rule.name,
          } as EscalationTriggeredEventData
        );
      }
    }
  }

  /**
   * Get prioritization rules
   * 
   * @returns Array of prioritization rules
   */
  private async getPrioritizationRules(): Promise<PrioritizationRule[]> {
    // In production, these would be loaded from database
    // For now, we'll use hardcoded rules from frontend
    return [
      {
        id: 'rule-1',
        name: 'Urgent Keyword',
        keyword: 'urgent',
        priority: 'High',
        isActive: true,
      },
      {
        id: 'rule-2',
        name: 'Outage Keywords',
        keyword: 'outage',
        priority: 'Critical',
        isActive: true,
      },
      {
        id: 'rule-3',
        name: 'Down Keywords',
        keyword: 'down',
        priority: 'Critical',
        isActive: true,
      },
    ];
  }

  /**
   * Get assignment rules
   * 
   * @returns Array of assignment rules
   */
  private async getAssignmentRules(): Promise<AssignmentRule[]> {
    // In production, these would be loaded from database
    // For now, we'll use hardcoded rules from frontend
    return [
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
  }

  /**
   * Get escalation rules
   * 
   * @returns Array of escalation rules
   */
  private async getEscalationRules(): Promise<EscalationRule[]> {
    // In production, these would be loaded from database
    // For now, we'll use hardcoded rules from frontend
    return [
      {
        id: 'rule-6',
        name: 'Critical Approved Escalation',
        priority: 'Critical',
        status: 'Approved',
        hours: 2,
        escalateToRole: 'Manager',
        isActive: true,
      },
      {
        id: 'rule-7',
        name: 'High Approved Escalation',
        priority: 'High',
        status: 'Approved',
        hours: 8,
        escalateToRole: 'Manager',
        isActive: true,
      },
      {
        id: 'rule-8',
        name: 'Critical InProgress Escalation',
        priority: 'Critical',
        status: 'InProgress',
        hours: 24,
        escalateToRole: 'Director',
        isActive: true,
      },
    ];
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
