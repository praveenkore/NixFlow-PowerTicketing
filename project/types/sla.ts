/**
 * SLA Type Definitions for NixFlow Frontend
 *
 * This file contains TypeScript type definitions for SLA (Service Level Agreement)
 * management features in the frontend application.
 */

// Re-export Category and Priority enums from the backend types
// These match the Prisma schema enum values
export enum Category {
  GeneralInquiry = 'GeneralInquiry',
  TechnicalSupport = 'TechnicalSupport',
  BillingQuestion = 'BillingQuestion',
  BugReport = 'BugReport',
  FeatureRequest = 'FeatureRequest',
  Hardware = 'Hardware',
  ProductionChange = 'ProductionChange',
}

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/**
 * SLA Status enumeration for SLA compliance tracking
 */
export enum SLAStatus {
  WithinSLA = 'WithinSLA',
  Warning = 'Warning',
  Breached = 'Breached',
}

/**
 * SLA Breach Type enumeration for different types of SLA breaches
 */
export enum SLABreachType {
  ResponseTime = 'ResponseTime',
  ResolutionTime = 'ResolutionTime',
  ApprovalTime = 'ApprovalTime',
}

/**
 * SLA Policy interface
 */
export interface SLAPolicy {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  responseTimeMins: number;
  resolutionTimeMins: number;
  approvalTimeMins: number | null;
  warningThreshold: number;
  category: Category | null;
  priority: Priority | null;
  workflowId: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  _count?: {
    slaMetrics: number;
    slaBreaches: number;
  };
}

/**
 * SLA Metric interface
 */
export interface SLAMetric {
  id: number;
  ticketId: number;
  slaPolicyId: number;
  ticketCreatedAt: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  approvalCompletedAt: Date | null;
  responseTimeMins: number | null;
  resolutionTimeMins: number | null;
  approvalTimeMins: number | null;
  targetResponseTimeMins: number;
  targetResolutionTimeMins: number;
  targetApprovalTimeMins: number | null;
  status: SLAStatus;
  createdAt: Date;
  updatedAt: Date;
  slaPolicy?: {
    id: number;
    name: string;
  };
  slaBreaches?: SLABreach[];
}

/**
 * SLA Breach interface
 */
export interface SLABreach {
  id: number;
  ticketId: number;
  slaMetricId: number;
  slaPolicyId: number;
  breachType: SLABreachType;
  breachedAt: Date;
  actualTimeMins: number;
  targetTimeMins: number;
  overageMins: number;
  status: string; // Open, Acknowledged, Resolved
  stageIndex: number | null;
  acknowledgedAt: Date | null;
  acknowledgedById: number | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  slaPolicy?: {
    id: number;
    name: string;
  };
  acknowledgedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * SLA Compliance Report interface
 */
export interface SLAComplianceReport {
  totalTickets: number;
  ticketsWithinSLA: number;
  ticketsWithWarning: number;
  ticketsBreached: number;
  complianceRate: number; // percentage
  avgResponseTime: number; // minutes
  avgResolutionTime: number; // minutes
  avgApprovalTime?: number; // minutes
  breachesByType: {
    [key in SLABreachType]: number;
  };
  breachesByPriority: {
    [key in Priority]: number;
  };
  breachesByCategory: {
    [key in Category]: number;
  };
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * SLA Dashboard Statistics interface
 */
export interface SLADashboardStats {
  totalPolicies: number;
  activePolicies: number;
  totalMetrics: number;
  totalBreaches: number;
  openBreaches: number;
  acknowledgedBreaches: number;
  resolvedBreaches: number;
  currentComplianceRate: number;
  topBreachedPolicies: Array<{
    policyId: number;
    policyName: string;
    breachCount: number;
  }>;
  recentBreaches: SLABreach[];
}

/**
 * SLA Policy Form Data interface
 */
export interface SLAPolicyFormData {
  name: string;
  description: string;
  isActive: boolean;
  responseTimeMins: number;
  resolutionTimeMins: number;
  approvalTimeMins: number | null;
  warningThreshold: number;
  category: Category | null;
  priority: Priority | null;
  workflowId: number | null;
}

/**
 * SLA Breach Acknowledgment Form Data interface
 */
export interface SLABreachAcknowledgmentFormData {
  resolutionNotes: string;
}

/**
 * SLA Time Tracking interface
 */
export interface SLATimeTracking {
  ticketId: number;
  ticketCreatedAt: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  approvalCompletedAt?: Date;
  timeToFirstResponse?: number; // minutes
  timeToResolution?: number; // minutes
  timeToApproval?: number; // minutes
  currentAge: number; // minutes since ticket creation
}

/**
 * SLA Policy Validation Result interface
 */
export interface SLAPolicyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * SLA Filter Options interface
 */
export interface SLAFilters {
  status?: SLAStatus;
  category?: Category;
  priority?: Priority;
  breachType?: SLABreachType;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * SLA Chart Data interface
 */
export interface SLAChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

/**
 * SLA Compliance Trend Data interface
 */
export interface SLAComplianceTrend {
  date: Date;
  complianceRate: number;
  totalTickets: number;
  ticketsWithinSLA: number;
  ticketsWithWarning: number;
  ticketsBreached: number;
}

/**
 * SLA Breach Trend Data interface
 */
export interface SLABreachTrend {
  date: Date;
  totalBreaches: number;
  responseTimeBreaches: number;
  resolutionTimeBreaches: number;
  approvalTimeBreaches: number;
}

/**
 * SLA Policy Summary interface
 */
export interface SLAPolicySummary {
  id: number;
  name: string;
  isActive: boolean;
  totalTickets: number;
  ticketsWithinSLA: number;
  ticketsWithWarning: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  avgApprovalTime: number | null;
}

/**
 * SLA Ticket Detail interface (extended Ticket with SLA info)
 */
export interface SLATicketDetail {
  ticketId: string;
  ticketIdNumber: number;
  title: string;
  status: string;
  priority: Priority;
  category: Category;
  createdAt: Date;
  slaMetric?: SLAMetric;
  slaPolicy?: SLAPolicy;
  slaBreaches?: SLABreach[];
  isAtRisk: boolean;
  slaStatus: SLAStatus;
  remainingTime?: {
    responseTime?: number; // minutes remaining
    resolutionTime?: number; // minutes remaining
    approvalTime?: number; // minutes remaining
  };
}

/**
 * SLA Notification interface
 */
export interface SLANotification {
  id: number;
  type: 'warning' | 'breach' | 'escalation';
  message: string;
  ticketId: string;
  ticketTitle: string;
  breachType?: SLABreachType;
  overageMins?: number;
  slaPolicyName: string;
  createdAt: Date;
  isRead: boolean;
}

/**
 * SLA Escalation Rule interface
 */
export interface SLAEscalationRule {
  id: string;
  name: string;
  breachType: SLABreachType;
  priority: Priority;
  overageThresholdMins: number;
  escalateToRole: string;
  escalateToUserId?: number;
  notifyEmails: string[];
  isActive: boolean;
}

/**
 * SLA Configuration interface
 */
export interface SLAConfiguration {
  enableAutoEscalation: boolean;
  enableAutoNotification: boolean;
  warningThresholdPercentage: number;
  checkIntervalMinutes: number;
  escalationRules: SLAEscalationRule[];
}

/**
 * SLA Report Export Options interface
 */
export interface SLAReportExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  reportType: 'compliance' | 'breaches' | 'policies' | 'summary';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  filters?: SLAFilters;
  includeDetails?: boolean;
}

/**
 * SLA Performance Metrics interface
 */
export interface SLAPerformanceMetrics {
  totalTickets: number;
  ticketsWithSLA: number;
  ticketsWithoutSLA: number;
  overallComplianceRate: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  avgApprovalTime: number;
  totalBreaches: number;
  breachRate: number; // percentage
  avgTimeToBreachResolution: number; // minutes
  mostCommonBreachType: SLABreachType;
  worstPerformingCategory?: Category;
  worstPerformingPriority?: Priority;
}

/**
 * SLA Policy Comparison interface
 */
export interface SLAPolicyComparison {
  policy1: SLAPolicySummary;
  policy2: SLAPolicySummary;
  comparison: {
    complianceRateDiff: number;
    avgResponseTimeDiff: number;
    avgResolutionTimeDiff: number;
    totalBreachesDiff: number;
  };
}
