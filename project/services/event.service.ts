/**
 * Event Service - NixFlow Event-Driven Architecture
 *
 * This file implements the event service for real-time updates
 * using Socket.IO client to listen to backend events.
 */

import { io, Socket } from 'socket.io-client';

// Event types matching backend events
export enum TicketEventType {
  TICKET_CREATED = 'ticket.created',
  TICKET_UPDATED = 'ticket.updated',
  TICKET_STATUS_CHANGED = 'ticket.status_changed',
  TICKET_ASSIGNED = 'ticket.assigned',
  TICKET_APPROVED = 'ticket.approved',
  TICKET_REJECTED = 'ticket.rejected',
  TICKET_ESCALATED = 'ticket.escalated',
  TICKET_CLOSED = 'ticket.closed',
}

export enum AutomationEventType {
  PRIORITIZATION_APPLIED = 'automation.prioritization_applied',
  ASSIGNMENT_APPLIED = 'automation.assignment_applied',
  ESCALATION_TRIGGERED = 'automation.escalation_triggered',
}

export enum SLAEventType {
  SLA_WARNING = 'sla.warning',
  SLA_BREACH = 'sla.breach',
  SLA_BREACH_ACKNOWLEDGED = 'sla.breach_acknowledged',
}

// Event data interfaces
export interface TicketCreatedEventData {
  ticketId: number;
  ticketNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
}

export interface TicketStatusChangedEventData {
  ticketId: number;
  ticketNumber: string;
  oldStatus: string;
  newStatus: string;
}

export interface TicketApprovedEventData {
  ticketId: number;
  ticketNumber: string;
  approvedBy: number;
  stageIndex: number;
}

export interface TicketRejectedEventData {
  ticketId: number;
  ticketNumber: string;
  rejectedBy: number;
  stageIndex: number;
}

export interface PrioritizationAppliedEventData {
  ticketId: number;
  ticketNumber: string;
  oldPriority: string;
  newPriority: string;
  rule: string;
}

export interface AssignmentAppliedEventData {
  ticketId: number;
  ticketNumber: string;
  oldAssigneeId: number | null;
  newAssigneeId: number;
  rule: string;
}

export interface SLAWarningEventData {
  ticketId: number;
  ticketNumber: string;
  warningType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  actualTimeMins: number;
  targetTimeMins: number;
  warningThreshold: number;
}

export interface SLABreachEventData {
  ticketId: number;
  ticketNumber: string;
  breachType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  actualTimeMins: number;
  targetTimeMins: number;
  overageMins: number;
}

// Event handler type
export type EventHandler<T = any> = (data: T) => void;

/**
 * Event Service Class
 * Manages Socket.IO connection and event listeners
 */
class EventService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private pendingSubscriptions: Array<{ eventType: string; handler: EventHandler }> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // 1 second
  private isConnecting: boolean = false;

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[EventService] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[EventService] Connection already in progress');
      return;
    }

    this.isConnecting = true;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('authToken');

    this.socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      auth: {
        token, // Send token for authentication
      },
    });

    this.setupEventHandlers();
    console.log('[EventService] Connecting to:', apiUrl);
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      this.pendingSubscriptions = [];
      this.isConnecting = false;
      console.log('[EventService] Disconnected');
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[EventService] Connected to server');
      this.reconnectAttempts = 0;
      this.isConnecting = false;

      // Process pending subscriptions
      this.processPendingSubscriptions();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[EventService] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[EventService] Connection error:', error);
      this.reconnectAttempts++;
      this.isConnecting = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[EventService] Reconnected after', attemptNumber, 'attempts');
      this.isConnecting = false;

      // Process pending subscriptions after reconnection
      this.processPendingSubscriptions();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[EventService] Failed to reconnect after', this.maxReconnectAttempts, 'attempts');
      this.isConnecting = false;
    });
  }

  /**
   * Process pending subscriptions after connection is established
   */
  private processPendingSubscriptions(): void {
    if (this.pendingSubscriptions.length === 0) return;

    console.log('[EventService] Processing', this.pendingSubscriptions.length, 'pending subscriptions');

    const subscriptionsToProcess = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];

    subscriptionsToProcess.forEach(({ eventType, handler }) => {
      this.on(eventType, handler);
    });
  }

  /**
   * Subscribe to an event
   *
   * @param eventType - The event type to subscribe to
   * @param handler - The event handler function
   */
  on<T = any>(eventType: string, handler: EventHandler<T>): void {
    if (!this.socket) {
      console.warn('[EventService] Cannot subscribe: socket not initialized');
      return;
    }

    // If not connected, queue the subscription for later
    if (!this.socket.connected && !this.isConnecting) {
      console.log('[EventService] Not connected, queuing subscription to:', eventType);
      this.pendingSubscriptions.push({ eventType, handler });
      return;
    }

    // If connecting, queue the subscription
    if (this.isConnecting) {
      console.log('[EventService] Connecting, queuing subscription to:', eventType);
      this.pendingSubscriptions.push({ eventType, handler });
      return;
    }

    // Add handler to listeners map
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Subscribe to Socket.IO event
    this.socket.on(eventType, handler);
    console.log('[EventService] Subscribed to:', eventType);
  }

  /**
   * Unsubscribe from an event
   *
   * @param eventType - The event type to unsubscribe from
   * @param handler - The event handler function to remove
   */
  off<T = any>(eventType: string, handler?: EventHandler<T>): void {
    if (!this.socket) return;

    const handlers = this.listeners.get(eventType);
    if (handlers) {
      if (handler) {
        // Remove specific handler
        handlers.delete(handler);
        this.socket.off(eventType, handler);
      } else {
        // Remove all handlers for this event type
        handlers.forEach(h => this.socket.off(eventType, h));
        handlers.clear();
      }
      console.log('[EventService] Unsubscribed from:', eventType);
    }
  }

  /**
   * Subscribe to ticket created events
   */
  onTicketCreated(handler: EventHandler<TicketCreatedEventData>): void {
    this.on(TicketEventType.TICKET_CREATED, handler);
  }

  /**
   * Subscribe to ticket status changed events
   */
  onTicketStatusChanged(handler: EventHandler<TicketStatusChangedEventData>): void {
    this.on(TicketEventType.TICKET_STATUS_CHANGED, handler);
  }

  /**
   * Subscribe to ticket approved events
   */
  onTicketApproved(handler: EventHandler<TicketApprovedEventData>): void {
    this.on(TicketEventType.TICKET_APPROVED, handler);
  }

  /**
   * Subscribe to ticket rejected events
   */
  onTicketRejected(handler: EventHandler<TicketRejectedEventData>): void {
    this.on(TicketEventType.TICKET_REJECTED, handler);
  }

  /**
   * Subscribe to prioritization applied events
   */
  onPrioritizationApplied(handler: EventHandler<PrioritizationAppliedEventData>): void {
    this.on(AutomationEventType.PRIORITIZATION_APPLIED, handler);
  }

  /**
   * Subscribe to assignment applied events
   */
  onAssignmentApplied(handler: EventHandler<AssignmentAppliedEventData>): void {
    this.on(AutomationEventType.ASSIGNMENT_APPLIED, handler);
  }

  /**
   * Subscribe to SLA warning events
   */
  onSLAWarning(handler: EventHandler<SLAWarningEventData>): void {
    this.on(SLAEventType.SLA_WARNING, handler);
  }

  /**
   * Subscribe to SLA breach events
   */
  onSLABreach(handler: EventHandler<SLABreachEventData>): void {
    this.on(SLAEventType.SLA_BREACH, handler);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const eventService = new EventService();

export default eventService;
