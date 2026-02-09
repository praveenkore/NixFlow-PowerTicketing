/**
 * Event Types - NixFlow Event-Driven Architecture
 * 
 * This file defines all event types, payloads, and enums used throughout
 * the event-driven system for NixFlow ticketing platform.
 */

/**
 * Ticket Lifecycle Events
 * Events emitted during the lifecycle of a ticket from creation to closure
 */
export enum TicketEventType {
  TICKET_CREATED = 'ticket.created',
  TICKET_UPDATED = 'ticket.updated',
  TICKET_STATUS_CHANGED = 'ticket.status_changed',
  TICKET_ASSIGNED = 'ticket.assigned',
  TICKET_APPROVED = 'ticket.approved',
  TICKET_REJECTED = 'ticket.rejected',
  TICKET_ESCALATED = 'ticket.escalated',
  TICKET_CLOSED = 'ticket.closed',
  TICKET_DELETED = 'ticket.deleted',
}

/**
 * Automation Events
 * Events emitted when automation rules are applied
 */
export enum AutomationEventType {
  PRIORITIZATION_APPLIED = 'automation.prioritization_applied',
  ASSIGNMENT_APPLIED = 'automation.assignment_applied',
  ESCALATION_TRIGGERED = 'automation.escalation_triggered',
  RULE_EVALUATED = 'automation.rule_evaluated',
  RULE_FAILED = 'automation.rule_failed',
}

/**
 * SLA Events
 * Events emitted for SLA-related operations
 */
export enum SLAEventType {
  SLA_METRIC_CREATED = 'sla.metric_created',
  SLA_METRIC_UPDATED = 'sla.metric_updated',
  SLA_WARNING = 'sla.warning',
  SLA_BREACH = 'sla.breach',
  SLA_BREACH_ACKNOWLEDGED = 'sla.breach_acknowledged',
  SLA_COMPLIANCE_REPORT_GENERATED = 'sla.compliance_report_generated',
}

/**
 * Knowledge Base Events
 * Events emitted for knowledge base operations
 */
export enum KBEventType {
  ARTICLE_CREATED = 'kb.article_created',
  ARTICLE_UPDATED = 'kb.article_updated',
  ARTICLE_PUBLISHED = 'kb.article_published',
  ARTICLE_ARCHIVED = 'kb.article_archived',
  ARTICLE_VIEWED = 'kb.article_viewed',
  ARTICLE_RATED = 'kb.article_rated',
  ARTICLE_SEARCHED = 'kb.article_searched',
}

/**
 * User Events
 * Events emitted for user-related operations
 */
export enum UserEventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
}

/**
 * Workflow Events
 * Events emitted for workflow-related operations
 */
export enum WorkflowEventType {
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_STAGE_CHANGED = 'workflow.stage_changed',
}

/**
 * Notification Events
 * Events emitted for notification operations
 */
export enum NotificationEventType {
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_READ = 'notification.read',
  NOTIFICATION_DISMISSED = 'notification.dismissed',
}

/**
 * Base Event Metadata
 * Common metadata included with all events
 */
export interface EventMetadata {
  /** User ID who triggered the event (0 for system events) */
  userId?: number;
  /** Unique correlation ID for tracking event chains */
  correlationId?: string;
  /** ID of the event that caused this event (for causality tracking) */
  causationId?: string;
  /** Event source (e.g., 'backend', 'worker', 'frontend') */
  source?: string;
  /** Event version for schema evolution */
  version?: string;
}

/**
 * Base Event Payload
 * All events extend this base structure
 */
export interface BaseEventPayload {
  /** Event type identifier */
  eventType: string;
  /** ISO 8601 timestamp when event was created */
  timestamp: Date;
  /** Event-specific data */
  data: any;
  /** Optional event metadata */
  metadata?: EventMetadata;
}

/**
 * Ticket Created Event Data
 */
export interface TicketCreatedEventData {
  ticketId: number;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requestorId: number;
  assigneeId: number;
  workflowId: number;
  currentStageIndex: number;
}

/**
 * Ticket Updated Event Data
 */
export interface TicketUpdatedEventData {
  ticketId: number;
  ticketNumber: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  updatedBy: number;
}

/**
 * Ticket Status Changed Event Data
 */
export interface TicketStatusChangedEventData {
  ticketId: number;
  ticketNumber: string;
  oldStatus: string;
  newStatus: string;
  changedBy: number;
  reason?: string;
}

/**
 * Ticket Assigned Event Data
 */
export interface TicketAssignedEventData {
  ticketId: number;
  ticketNumber: string;
  oldAssigneeId: number | null;
  newAssigneeId: number;
  assignedBy: number;
  reason?: string;
}

/**
 * Ticket Approved Event Data
 */
export interface TicketApprovedEventData {
  ticketId: number;
  ticketNumber: string;
  approvedBy: number;
  stageIndex: number;
  comment?: string;
}

/**
 * Ticket Rejected Event Data
 */
export interface TicketRejectedEventData {
  ticketId: number;
  ticketNumber: string;
  rejectedBy: number;
  stageIndex: number;
  reason: string;
}

/**
 * Ticket Escalated Event Data
 */
export interface TicketEscalatedEventData {
  ticketId: number;
  ticketNumber: string;
  escalatedTo: number;
  escalatedFrom: number;
  rule: string;
  reason?: string;
}

/**
 * Ticket Closed Event Data
 */
export interface TicketClosedEventData {
  ticketId: number;
  ticketNumber: string;
  closedBy: number;
  resolution?: string;
}

/**
 * Prioritization Applied Event Data
 */
export interface PrioritizationAppliedEventData {
  ticketId: number;
  ticketNumber: string;
  oldPriority: string;
  newPriority: string;
  rule: string;
  triggeredBy: string;
}

/**
 * Assignment Applied Event Data
 */
export interface AssignmentAppliedEventData {
  ticketId: number;
  ticketNumber: string;
  oldAssigneeId: number | null;
  newAssigneeId: number;
  rule: string;
  triggeredBy: string;
}

/**
 * Escalation Triggered Event Data
 */
export interface EscalationTriggeredEventData {
  ticketId: number;
  ticketNumber: string;
  escalatedTo: number;
  escalatedFrom: number | null;
  rule: string;
  hoursInStatus?: number;
  thresholdHours?: number;
}

/**
 * SLA Metric Created Event Data
 */
export interface SLAMetricCreatedEventData {
  ticketId: number;
  ticketNumber: string;
  slaMetricId: number;
  slaPolicyId: number;
  responseTimeTarget: number;
  resolutionTimeTarget: number;
  approvalTimeTarget: number;
}

/**
 * SLA Warning Event Data
 */
export interface SLAWarningEventData {
  ticketId: number;
  ticketNumber: string;
  slaMetricId: number;
  slaPolicyId: number;
  warningType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  actualTimeMins: number;
  targetTimeMins: number;
  warningThreshold: number;
  stageIndex?: number;
}

/**
 * SLA Breach Event Data
 */
export interface SLABreachEventData {
  ticketId: number;
  ticketNumber: string;
  slaMetricId: number;
  slaPolicyId: number;
  breachType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  actualTimeMins: number;
  targetTimeMins: number;
  overageMins: number;
  stageIndex?: number;
}

/**
 * SLA Breach Acknowledged Event Data
 */
export interface SLABreachAcknowledgedEventData {
  ticketId: number;
  ticketNumber: string;
  breachId: number;
  acknowledgedBy: number;
  resolutionNotes: string;
}

/**
 * Knowledge Article Created Event Data
 */
export interface ArticleCreatedEventData {
  articleId: number;
  title: string;
  slug: string;
  authorId: number;
  categoryId: number;
  status: string;
}

/**
 * Knowledge Article Published Event Data
 */
export interface ArticlePublishedEventData {
  articleId: number;
  title: string;
  slug: string;
  publishedBy: number;
  version: number;
}

/**
 * Knowledge Article Viewed Event Data
 */
export interface ArticleViewedEventData {
  articleId: number;
  title: string;
  slug: string;
  viewedBy: number;
}

/**
 * Knowledge Article Rated Event Data
 */
export interface ArticleRatedEventData {
  articleId: number;
  title: string;
  slug: string;
  ratedBy: number;
  rating: number;
  comment?: string;
}

/**
 * User Login Event Data
 */
export interface UserLoginEventData {
  userId: number;
  email: string;
  loginTime: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Workflow Started Event Data
 */
export interface WorkflowStartedEventData {
  ticketId: number;
  ticketNumber: string;
  workflowId: number;
  workflowName: string;
  startedBy: number;
}

/**
 * Workflow Stage Changed Event Data
 */
export interface WorkflowStageChangedEventData {
  ticketId: number;
  ticketNumber: string;
  workflowId: number;
  workflowName: string;
  oldStageIndex: number;
  newStageIndex: number;
  oldStageName: string;
  newStageName: string;
  changedBy: number;
}

/**
 * Notification Sent Event Data
 */
export interface NotificationSentEventData {
  notificationId: number;
  recipientId: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

/**
 * Event Priority Levels
 * Used for event prioritization in high-volume scenarios
 */
export enum EventPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

/**
 * Event Status
 * Used for tracking event processing status
 */
export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

/**
 * Complete Event Interface
 * Combines base payload with additional metadata
 */
export interface Event extends BaseEventPayload {
  /** Unique event ID */
  id: string;
  /** Event priority */
  priority?: EventPriority;
  /** Event processing status */
  status?: EventStatus;
  /** Number of retry attempts */
  retryCount?: number;
  /** Error message if event failed */
  error?: string;
}
