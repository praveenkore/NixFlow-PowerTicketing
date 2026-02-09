/**
 * SLA Type Definitions for NixFlow Ticketing System
 * 
 * This file contains TypeScript type definitions for SLA (Service Level Agreement)
 * management features including policies, metrics, breaches, and compliance reporting.
 */

import { Category, Priority, SLAStatus, SLABreachType } from '@prisma/client';

// Re-export Prisma enums for convenience
export { SLAStatus, SLABreachType };

/**
 * Input type for creating a new SLA Policy
 */
export interface SLAPolicyInput {
  name: string;
  description?: string;
  isActive?: boolean;
  responseTimeMins: number;
  resolutionTimeMins: number;
  approvalTimeMins?: number;
  warningThreshold?: number;
  category?: Category;
  priority?: Priority;
  workflowId?: number;
  createdById: number;
}

/**
 * Input type for updating an existing SLA Policy
 */
export interface SLAPolicyUpdateInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  responseTimeMins?: number;
  resolutionTimeMins?: number;
  approvalTimeMins?: number;
  warningThreshold?: number;
  category?: Category | null;
  priority?: Priority | null;
  workflowId?: number | null;
}

/**
 * Input type for creating a new SLA Metric
 */
export interface SLAMetricInput {
  ticketId: number;
  slaPolicyId: number;
  ticketCreatedAt: Date;
  targetResponseTimeMins: number;
  targetResolutionTimeMins: number;
  targetApprovalTimeMins?: number;
}

/**
 * Input type for updating an existing SLA Metric
 */
export interface SLAMetricUpdateInput {
  firstResponseAt?: Date;
  resolvedAt?: Date;
  approvalCompletedAt?: Date;
  responseTimeMins?: number;
  resolutionTimeMins?: number;
  approvalTimeMins?: number;
  status?: SLAStatus;
}

/**
 * Input type for creating a new SLA Breach record
 */
export interface SLABreachInput {
  ticketId: number;
  slaMetricId: number;
  slaPolicyId: number;
  breachType: SLABreachType;
  actualTimeMins: number;
  targetTimeMins: number;
  overageMins: number;
  stageIndex?: number;
}

/**
 * Input type for acknowledging an SLA Breach
 */
export interface SLABreachAcknowledgmentInput {
  acknowledgedById: number;
  resolutionNotes?: string;
}

/**
 * Result of SLA calculation for a ticket
 */
export interface SLACalculationResult {
  ticketId: number;
  slaPolicyId: number;
  responseTimeMins?: number;
  resolutionTimeMins?: number;
  approvalTimeMins?: number;
  targetResponseTimeMins: number;
  targetResolutionTimeMins: number;
  targetApprovalTimeMins?: number;
  status: SLAStatus;
  breaches: SLABreachCalculation[];
}

/**
 * Individual breach calculation result
 */
export interface SLABreachCalculation {
  breachType: SLABreachType;
  actualTimeMins: number;
  targetTimeMins: number;
  overageMins: number;
  stageIndex?: number;
}

/**
 * Criteria for matching SLA policies to tickets
 */
export interface SLAPolicyMatchCriteria {
  category?: Category;
  priority?: Priority;
  workflowId?: number;
}

/**
 * SLA Compliance Report data structure
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
 * SLA Policy with related data
 */
export interface SLAPolicyWithRelations {
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
 * SLA Metric with related data
 */
export interface SLAMetricWithRelations {
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
  slaBreaches?: SLABreachWithRelations[];
}

/**
 * SLA Breach with related data
 */
export interface SLABreachWithRelations {
  id: number;
  ticketId: number;
  slaMetricId: number;
  slaPolicyId: number;
  breachType: SLABreachType;
  breachedAt: Date;
  actualTimeMins: number;
  targetTimeMins: number;
  overageMins: number;
  status: string;
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
  } | null;
}

/**
 * SLA Dashboard statistics
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
  recentBreaches: SLABreachWithRelations[];
}

/**
 * SLA Warning threshold configuration
 */
export interface SLAWarningThreshold {
  percentage: number; // 0.0 to 1.0 (e.g., 0.8 for 80%)
  minutesBeforeBreach?: number; // Optional: absolute minutes before breach
}

/**
 * SLA Time tracking for a ticket
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
 * SLA Policy validation result
 */
export interface SLAPolicyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * SLA Breach notification payload
 */
export interface SLABreachNotification {
  breachId: number;
  ticketId: string;
  ticketTitle: string;
  breachType: SLABreachType;
  overageMins: number;
  slaPolicyName: string;
  assigneeEmail?: string;
  managerEmail?: string;
  createdAt: Date;
}

/**
 * SLA Configuration options
 */
export interface SLAConfiguration {
  enableAutoEscalation: boolean;
  enableAutoNotification: boolean;
  warningThresholdPercentage: number;
  checkIntervalMinutes: number;
  escalationRules: SLAEscalationRule[];
}

/**
 * SLA Escalation rule
 */
export interface SLAEscalationRule {
  id: string;
  breachType: SLABreachType;
  priority: Priority;
  overageThresholdMins: number;
  escalateToRole: string;
  notifyEmails: string[];
}
