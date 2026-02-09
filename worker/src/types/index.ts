/**
 * Worker Service Type Definitions for NixFlow Ticketing System
 * 
 * This file contains TypeScript type definitions for background worker services
 * that handle SLA monitoring, calculations, and breach notifications.
 */

/**
 * SLA Monitoring Job Data
 * 
 * Payload for the SLA monitoring job that runs periodically to check
 * for SLA breaches and update SLA metrics.
 */
export interface SLAMonitoringJobData {
  jobId: string;
  timestamp: Date;
  checkIntervalMinutes: number;
  ticketIds?: number[]; // Optional: specific tickets to check
  options?: {
    includeResolved?: boolean;
    includeClosed?: boolean;
    maxTickets?: number;
  };
}

/**
 * SLA Calculation Job Data
 * 
 * Payload for the SLA calculation job that computes SLA metrics
 * for a specific ticket or batch of tickets.
 */
export interface SLACalculationJobData {
  jobId: string;
  timestamp: Date;
  ticketId: number;
  slaPolicyId: number;
  calculationType: 'initial' | 'update' | 'final';
  eventData?: {
    eventType: 'first_response' | 'approval_complete' | 'resolution';
    eventTimestamp: Date;
  };
}

/**
 * SLA Breach Notification Job Data
 * 
 * Payload for the SLA breach notification job that sends alerts
 * when SLA breaches occur.
 */
export interface SLABreachNotificationJobData {
  jobId: string;
  timestamp: Date;
  breachId: number;
  ticketId: number;
  ticketTitle: string;
  ticketIdString: string; // e.g., TKT-20240129-0001
  breachType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  overageMins: number;
  slaPolicyName: string;
  slaPolicyId: number;
  assigneeEmail?: string;
  assigneeId?: number;
  managerEmail?: string;
  managerId?: number;
  additionalRecipients?: string[];
  notificationChannels: ('email' | 'in_app' | 'sms' | 'webhook')[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * SLA Warning Notification Job Data
 * 
 * Payload for the SLA warning notification job that sends alerts
 * when tickets are approaching SLA breach thresholds.
 */
export interface SLAWarningNotificationJobData {
  jobId: string;
  timestamp: Date;
  ticketId: number;
  ticketTitle: string;
  ticketIdString: string;
  warningType: 'response_time' | 'resolution_time' | 'approval_time';
  remainingMins: number;
  slaPolicyName: string;
  slaPolicyId: number;
  assigneeEmail?: string;
  assigneeId?: number;
  managerEmail?: string;
  managerId?: number;
  notificationChannels: ('email' | 'in_app' | 'sms')[];
}

/**
 * SLA Compliance Report Job Data
 * 
 * Payload for the SLA compliance report generation job.
 */
export interface SLAComplianceReportJobData {
  jobId: string;
  timestamp: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  reportType: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  includeDetails?: boolean;
  filters?: {
    categories?: string[];
    priorities?: string[];
    workflows?: number[];
  };
}

/**
 * SLA Escalation Job Data
 * 
 * Payload for the SLA escalation job that escalates tickets
 * when SLA breaches exceed configured thresholds.
 */
export interface SLAEscalationJobData {
  jobId: string;
  timestamp: Date;
  breachId: number;
  ticketId: number;
  breachType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  overageMins: number;
  escalateToRole: string;
  escalateToUserId?: number;
  escalationReason: string;
  notifyEmails: string[];
}

/**
 * Worker Job Status
 * 
 * Status tracking for worker jobs.
 */
export enum WorkerJobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Worker Job Result
 * 
 * Result structure for completed worker jobs.
 */
export interface WorkerJobResult {
  jobId: string;
  status: WorkerJobStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * SLA Monitoring Configuration
 * 
 * Configuration for the SLA monitoring worker service.
 */
export interface SLAMonitoringConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  batchSize: number;
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelayMs: number;
  enableAutoEscalation: boolean;
  enableAutoNotification: boolean;
  escalationRules: SLAEscalationRule[];
}

/**
 * SLA Escalation Rule
 * 
 * Rule configuration for automatic escalation on SLA breaches.
 */
export interface SLAEscalationRule {
  id: string;
  name: string;
  breachType: 'ResponseTime' | 'ResolutionTime' | 'ApprovalTime';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  overageThresholdMins: number;
  escalateToRole: string;
  escalateToUserId?: number;
  notifyEmails: string[];
  isActive: boolean;
}

/**
 * Worker Queue Configuration
 * 
 * Configuration for the worker job queue.
 */
export interface WorkerQueueConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  maxConcurrentJobs: number;
  priorityLevels: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * SLA Batch Processing Job Data
 * 
 * Payload for batch processing of multiple tickets.
 */
export interface SLABatchProcessingJobData {
  jobId: string;
  timestamp: Date;
  ticketIds: number[];
  operation: 'calculate' | 'check_breaches' | 'update_status';
  options?: {
    skipExistingMetrics?: boolean;
    forceRecalculation?: boolean;
  };
}

/**
 * SLA Policy Update Job Data
 * 
 * Payload for updating SLA policies and recalculating affected tickets.
 */
export interface SLAPolicyUpdateJobData {
  jobId: string;
  timestamp: Date;
  policyId: number;
  updateType: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  recalculateAffectedTickets?: boolean;
  affectedTicketIds?: number[];
}

/**
 * Worker Health Check Result
 * 
 * Health check result for the worker service.
 */
export interface WorkerHealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number; // seconds
  activeJobs: number;
  queuedJobs: number;
  failedJobs: number;
  lastJobCompletedAt?: Date;
  systemMetrics: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
  };
}

/**
 * SLA Metric Snapshot
 * 
 * Snapshot of SLA metrics at a point in time.
 */
export interface SLAMetricSnapshot {
  snapshotId: string;
  timestamp: Date;
  totalTickets: number;
  ticketsWithinSLA: number;
  ticketsWithWarning: number;
  ticketsBreached: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  avgApprovalTime: number;
  totalBreaches: number;
  openBreaches: number;
  resolvedBreaches: number;
}

/**
 * Worker Job Priority
 * 
 * Priority levels for worker jobs.
 */
export enum WorkerJobPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/**
 * SLA Event Type
 * 
 * Types of SLA-related events that can trigger worker jobs.
 */
export enum SLAEventType {
  TicketCreated = 'ticket_created',
  FirstResponse = 'first_response',
  ApprovalComplete = 'approval_complete',
  TicketResolved = 'ticket_resolved',
  TicketClosed = 'ticket_closed',
  SLABreachDetected = 'sla_breach_detected',
  SLAWarningTriggered = 'sla_warning_triggered',
  PolicyUpdated = 'policy_updated',
}

/**
 * SLA Event Payload
 * 
 * Payload structure for SLA events.
 */
export interface SLAEventPayload {
  eventType: SLAEventType;
  timestamp: Date;
  ticketId: number;
  ticketData?: {
    ticketIdString: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    assigneeId?: number;
    workflowId?: number;
  };
  slaData?: {
    policyId: number;
    policyName: string;
    metricId?: number;
    breachId?: number;
  };
  userId?: number;
  metadata?: Record<string, any>;
}

/**
 * Knowledge Search Indexing Job Data
 *
 * Payload for the knowledge base search indexing job that updates
 * the search index for articles.
 */
export interface KnowledgeSearchIndexingJobData {
  jobId: string;
  timestamp: Date;
  articleIds?: number[]; // Optional: specific articles to index
  operation: 'create' | 'update' | 'delete' | 'rebuild';
  options?: {
    includeDrafts?: boolean;
    includeArchived?: boolean;
    batchSize?: number;
  };
}

/**
 * Knowledge Article Publishing Job Data
 *
 * Payload for the knowledge base article publishing job that handles
 * the publishing workflow including notifications and version tracking.
 */
export interface KnowledgeArticlePublishingJobData {
  jobId: string;
  timestamp: Date;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  authorId: number;
  authorEmail: string;
  categoryId?: number;
  category?: string;
  tagIds: number[];
  version: number;
  notifyEmails: string[];
  notificationChannels: ('email' | 'in_app' | 'webhook')[];
}

/**
 * Knowledge Analytics Job Data
 *
 * Payload for the knowledge base analytics job that generates
 * reports and statistics on article usage.
 */
export interface KnowledgeAnalyticsJobData {
  jobId: string;
  timestamp: Date;
  reportType: 'daily' | 'weekly' | 'monthly';
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  recipients: string[];
  includeDetails?: boolean;
  filters?: {
    categoryIds?: number[];
    tagIds?: number[];
    authorIds?: number[];
    status?: string[];
  };
}

/**
 * Knowledge Article Review Job Data
 *
 * Payload for the knowledge base article review job that sends
 * notifications for articles pending review.
 */
export interface KnowledgeArticleReviewJobData {
  jobId: string;
  timestamp: Date;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  authorId: number;
  authorEmail: string;
  authorName: string;
  reviewerId: number;
  reviewerEmail: string;
  reviewerName: string;
  categoryId?: number;
  category?: string;
  submittedAt: Date;
  notificationChannels: ('email' | 'in_app')[];
}

/**
 * Knowledge Related Articles Job Data
 *
 * Payload for the knowledge base related articles job that updates
 * related article suggestions based on content similarity.
 */
export interface KnowledgeRelatedArticlesJobData {
  jobId: string;
  timestamp: Date;
  articleId: number;
  operation: 'calculate' | 'update' | 'recalculate_all';
  options?: {
    maxRelatedArticles?: number;
    minSimilarityScore?: number;
  };
}

/**
 * Knowledge Article Archive Job Data
 *
 * Payload for the knowledge base article archiving job that handles
 * the archiving workflow including notifications.
 */
export interface KnowledgeArticleArchiveJobData {
  jobId: string;
  timestamp: Date;
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  authorId: number;
  authorEmail: string;
  archivedBy: number;
  archivedByEmail: string;
  archivedByName: string;
  reason: string;
  notifyEmails: string[];
  notificationChannels: ('email' | 'in_app')[];
}

/**
 * Knowledge Popular Articles Job Data
 *
 * Payload for the knowledge base popular articles job that calculates
 * and updates popular article rankings.
 */
export interface KnowledgePopularArticlesJobData {
  jobId: string;
  timestamp: Date;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number;
  categoryIds?: number[];
}

/**
 * Knowledge Article Feedback Job Data
 *
 * Payload for the knowledge base article feedback job that processes
 * and analyzes user feedback on articles.
 */
export interface KnowledgeArticleFeedbackJobData {
  jobId: string;
  timestamp: Date;
  feedbackId: number;
  articleId: number;
  articleTitle: string;
  userId: number;
  userEmail: string;
  helpful: boolean;
  comment: string | null;
  notifyAuthor?: boolean;
}

/**
 * Knowledge Bulk Operation Job Data
 *
 * Payload for the knowledge base bulk operation job that handles
 * bulk actions on multiple articles.
 */
export interface KnowledgeBulkOperationJobData {
  jobId: string;
  timestamp: Date;
  operation: 'publish' | 'archive' | 'delete' | 'update_category' | 'update_tags';
  articleIds: number[];
  performedBy: number;
  performedByEmail: string;
  performedByName: string;
  parameters?: {
    categoryId?: number;
    tagIds?: number[];
    reason?: string;
  };
  notifyEmails: string[];
  notificationChannels: ('email' | 'in_app')[];
}

/**
 * Ticket Automation Job Data
 *
 * Payload for ticket automation job that applies
 * prioritization and assignment rules to tickets.
 */
export interface TicketAutomationJobData {
  jobId: string;
  timestamp: Date;
  ticketId: number;
  ticketNumber: string;
  automationType: 'prioritization' | 'assignment' | 'both';
  triggerEvent?: 'ticket_created' | 'ticket_updated' | 'ticket_status_changed';
  userId?: number;
}

/**
 * Escalation Check Job Data
 *
 * Payload for escalation check job that monitors
 * tickets for time-based escalation triggers.
 */
export interface EscalationCheckJobData {
  jobId: string;
  timestamp: Date;
  checkType: 'periodic' | 'triggered';
  ticketIds?: number[]; // Optional: specific tickets to check
  options?: {
    includeResolved?: boolean;
    includeClosed?: boolean;
    maxTickets?: number;
  };
}
