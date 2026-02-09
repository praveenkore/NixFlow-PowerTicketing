/**
 * SLA Repository - Database operations for SLA entities
 * 
 * This repository handles all database operations for SLA Policies, SLA Metrics,
 * and SLA Breaches using Prisma ORM.
 */

import { PrismaClient, Category, Priority } from '@prisma/client';
import {
  SLAPolicyInput,
  SLAPolicyUpdateInput,
  SLAMetricInput,
  SLAMetricUpdateInput,
  SLABreachInput,
  SLABreachAcknowledgmentInput,
  SLAPolicyMatchCriteria,
  SLAComplianceReport,
  SLAPolicyWithRelations,
  SLAMetricWithRelations,
  SLABreachWithRelations,
} from '../types/sla.types';

const prisma = new PrismaClient();

export class SLARepository {
  /**
   * Create a new SLA Policy
   */
  async createSLAPolicy(data: SLAPolicyInput): Promise<SLAPolicyWithRelations> {
    return await prisma.sLAPolicy.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        responseTimeMins: data.responseTimeMins,
        resolutionTimeMins: data.resolutionTimeMins,
        approvalTimeMins: data.approvalTimeMins,
        warningThreshold: data.warningThreshold ?? 0.8,
        category: data.category,
        priority: data.priority,
        workflowId: data.workflowId,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        workflow: {
          include: { stages: true },
        },
      },
    });
  }

  /**
   * Update an existing SLA Policy
   */
  async updateSLAPolicy(id: number, data: SLAPolicyUpdateInput): Promise<SLAPolicyWithRelations> {
    return await prisma.sLAPolicy.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.responseTimeMins !== undefined && { responseTimeMins: data.responseTimeMins }),
        ...(data.resolutionTimeMins !== undefined && { resolutionTimeMins: data.resolutionTimeMins }),
        ...(data.approvalTimeMins !== undefined && { approvalTimeMins: data.approvalTimeMins }),
        ...(data.warningThreshold !== undefined && { warningThreshold: data.warningThreshold }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.workflowId !== undefined && { workflowId: data.workflowId }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        workflow: {
          include: { stages: true },
        },
      },
    });
  }

  /**
   * Delete an SLA Policy
   */
  async deleteSLAPolicy(id: number): Promise<void> {
    await prisma.sLAPolicy.delete({
      where: { id },
    });
  }

  /**
   * Get SLA Policies with pagination and filters
   */
  async getSLAPolicies(filters: {
    isActive?: boolean;
    category?: Category;
    priority?: Priority;
    workflowId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SLAPolicyWithRelations[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.category !== undefined) {
      where.category = filters.category;
    }
    if (filters.priority !== undefined) {
      where.priority = filters.priority;
    }
    if (filters.workflowId !== undefined) {
      where.workflowId = filters.workflowId;
    }

    const [items, total] = await Promise.all([
      prisma.sLAPolicy.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          workflow: {
            include: { stages: true },
          },
          _count: {
            select: { slaMetrics: true, slaBreaches: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sLAPolicy.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get a specific SLA Policy by ID
   */
  async getSLAPolicyById(id: number): Promise<SLAPolicyWithRelations | null> {
    if (!id || isNaN(id)) {
      throw new Error('Invalid Policy ID provided to repository');
    }
    return await prisma.sLAPolicy.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        workflow: {
          include: { stages: true },
        },
        _count: {
          select: { slaMetrics: true, slaBreaches: true },
        },
      },
    });
  }

  /**
   * Find matching SLA Policy for a ticket based on criteria
   * Priority: Exact match → Partial match → Fallback
   */
  async findMatchingSLAPolicy(criteria: SLAPolicyMatchCriteria): Promise<SLAPolicyWithRelations | null> {
    const { category, priority, workflowId } = criteria;

    // Try exact match first (category + priority + workflowId)
    if (category && priority && workflowId) {
      const exactMatch = await prisma.sLAPolicy.findFirst({
        where: {
          isActive: true,
          category,
          priority,
          workflowId,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          workflow: {
            include: { stages: true },
          },
        },
      });
      if (exactMatch) return exactMatch;
    }

    // Try partial match (category + priority)
    if (category && priority) {
      const partialMatch = await prisma.sLAPolicy.findFirst({
        where: {
          isActive: true,
          category,
          priority,
          workflowId: null,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          workflow: {
            include: { stages: true },
          },
        },
      });
      if (partialMatch) return partialMatch;
    }

    // Try fallback (category only)
    if (category) {
      const fallbackMatch = await prisma.sLAPolicy.findFirst({
        where: {
          isActive: true,
          category,
          priority: null,
          workflowId: null,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          workflow: {
            include: { stages: true },
          },
        },
      });
      if (fallbackMatch) return fallbackMatch;
    }

    return null;
  }

  /**
   * Create a new SLA Metric
   */
  async createSLAMetric(data: SLAMetricInput): Promise<SLAMetricWithRelations> {
    return await prisma.sLAMetric.create({
      data: {
        ticketId: data.ticketId,
        slaPolicyId: data.slaPolicyId,
        ticketCreatedAt: data.ticketCreatedAt,
        targetResponseTimeMins: data.targetResponseTimeMins,
        targetResolutionTimeMins: data.targetResolutionTimeMins,
        targetApprovalTimeMins: data.targetApprovalTimeMins,
      },
      include: {
        slaPolicy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Update an existing SLA Metric
   */
  async updateSLAMetric(ticketId: number, data: SLAMetricUpdateInput): Promise<SLAMetricWithRelations> {
    return await prisma.sLAMetric.update({
      where: { ticketId },
      data: {
        ...(data.firstResponseAt !== undefined && { firstResponseAt: data.firstResponseAt }),
        ...(data.resolvedAt !== undefined && { resolvedAt: data.resolvedAt }),
        ...(data.approvalCompletedAt !== undefined && { approvalCompletedAt: data.approvalCompletedAt }),
        ...(data.responseTimeMins !== undefined && { responseTimeMins: data.responseTimeMins }),
        ...(data.resolutionTimeMins !== undefined && { resolutionTimeMins: data.resolutionTimeMins }),
        ...(data.approvalTimeMins !== undefined && { approvalTimeMins: data.approvalTimeMins }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        slaPolicy: {
          select: { id: true, name: true },
        },
        slaBreaches: true,
      },
    });
  }

  /**
   * Get SLA Metric by ticket ID
   */
  async getSLAMetricByTicketId(ticketId: number): Promise<SLAMetricWithRelations | null> {
    return await prisma.sLAMetric.findUnique({
      where: { ticketId },
      include: {
        slaPolicy: {
          select: { id: true, name: true },
        },
        slaBreaches: true,
      },
    });
  }

  /**
   * Get SLA Metrics with pagination and filters
   */
  async getSLAMetrics(filters: {
    status?: string;
    slaPolicyId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SLAMetricWithRelations[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.status !== undefined) {
      where.status = filters.status as any;
    }
    if (filters.slaPolicyId !== undefined) {
      where.slaPolicyId = filters.slaPolicyId;
    }

    const [items, total] = await Promise.all([
      prisma.sLAMetric.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          slaPolicy: {
            select: { id: true, name: true },
          },
          slaBreaches: true,
        },
        orderBy: { ticketCreatedAt: 'desc' },
      }),
      prisma.sLAMetric.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Create a new SLA Breach
   */
  async createSLABreach(data: SLABreachInput): Promise<SLABreachWithRelations> {
    return await prisma.sLABreach.create({
      data: {
        ticketId: data.ticketId,
        slaMetricId: data.slaMetricId,
        slaPolicyId: data.slaPolicyId,
        breachType: data.breachType,
        actualTimeMins: data.actualTimeMins,
        targetTimeMins: data.targetTimeMins,
        overageMins: data.overageMins,
        stageIndex: data.stageIndex,
      },
      include: {
        slaPolicy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Acknowledge an SLA Breach
   */
  async acknowledgeBreach(id: number, data: SLABreachAcknowledgmentInput): Promise<SLABreachWithRelations> {
    return await prisma.sLABreach.update({
      where: { id },
      data: {
        status: 'Acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedById: data.acknowledgedById,
        resolutionNotes: data.resolutionNotes,
      },
      include: {
        slaPolicy: {
          select: { id: true, name: true },
        },
        acknowledgedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get SLA Breaches with pagination and filters
   */
  async getSLABreaches(filters: {
    ticketId?: number;
    slaPolicyId?: number;
    breachType?: string;
    acknowledged?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SLABreachWithRelations[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.ticketId !== undefined) {
      where.ticketId = filters.ticketId;
    }
    if (filters.slaPolicyId !== undefined) {
      where.slaPolicyId = filters.slaPolicyId;
    }
    if (filters.breachType !== undefined) {
      where.breachType = filters.breachType;
    }
    if (filters.acknowledged !== undefined) {
      where.status = filters.acknowledged ? 'Acknowledged' : 'Open';
    }

    const [items, total] = await Promise.all([
      prisma.sLABreach.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          slaPolicy: {
            select: { id: true, name: true },
          },
          acknowledgedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { breachedAt: 'desc' },
      }),
      prisma.sLABreach.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get a specific SLA Breach by ID
   */
  async getSLABreachById(id: number): Promise<SLABreachWithRelations | null> {
    return await prisma.sLABreach.findUnique({
      where: { id },
      include: {
        slaPolicy: {
          select: { id: true, name: true },
        },
        acknowledgedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get SLA Compliance Report
   */
  async getComplianceReport(startDate?: Date, endDate?: Date): Promise<SLAComplianceReport> {
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.ticketCreatedAt = { ...dateFilter.ticketCreatedAt, gte: startDate };
    }
    if (endDate) {
      dateFilter.ticketCreatedAt = { ...dateFilter.ticketCreatedAt, lte: endDate };
    }

    const metrics = await prisma.sLAMetric.findMany({
      where: dateFilter,
      include: {
        slaPolicy: true,
        ticket: {
          select: { priority: true, category: true },
        },
      },
    });

    const breaches = await prisma.sLABreach.findMany({
      where: dateFilter,
      include: {
        slaPolicy: true,
        ticket: {
          select: { priority: true, category: true },
        },
      },
    });

    const totalTickets = metrics.length;
    const ticketsWithinSLA = metrics.filter((m) => m.status === 'WithinSLA').length;
    const ticketsWithWarning = metrics.filter((m) => m.status === 'Warning').length;
    const ticketsBreached = metrics.filter((m) => m.status === 'Breached').length;

    const complianceRate = totalTickets > 0 ? (ticketsWithinSLA / totalTickets) * 100 : 0;

    const metricsWithResponseTime = metrics.filter((m) => m.responseTimeMins !== null);
    const avgResponseTime =
      metricsWithResponseTime.length > 0
        ? metricsWithResponseTime.reduce((sum, m) => sum + (m.responseTimeMins || 0), 0) / metricsWithResponseTime.length
        : 0;

    const metricsWithResolutionTime = metrics.filter((m) => m.resolutionTimeMins !== null);
    const avgResolutionTime =
      metricsWithResolutionTime.length > 0
        ? metricsWithResolutionTime.reduce((sum, m) => sum + (m.resolutionTimeMins || 0), 0) / metricsWithResolutionTime.length
        : 0;

    const metricsWithApprovalTime = metrics.filter((m) => m.approvalTimeMins !== null);
    const avgApprovalTime =
      metricsWithApprovalTime.length > 0
        ? metricsWithApprovalTime.reduce((sum, m) => sum + (m.approvalTimeMins || 0), 0) / metricsWithApprovalTime.length
        : undefined;

    const breachesByType: any = {
      ResponseTime: 0,
      ResolutionTime: 0,
      ApprovalTime: 0,
    };
    breaches.forEach((b) => {
      breachesByType[b.breachType]++;
    });

    const breachesByPriority: any = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };
    breaches.forEach((b) => {
      const priority = b.ticket?.priority || 'Medium';
      breachesByPriority[priority]++;
    });

    const breachesByCategory: any = {
      GeneralInquiry: 0,
      TechnicalSupport: 0,
      BillingQuestion: 0,
      BugReport: 0,
      FeatureRequest: 0,
      Hardware: 0,
      ProductionChange: 0,
    };
    breaches.forEach((b) => {
      const category = b.ticket?.category || 'GeneralInquiry';
      breachesByCategory[category]++;
    });

    return {
      totalTickets,
      ticketsWithinSLA,
      ticketsWithWarning,
      ticketsBreached,
      complianceRate,
      avgResponseTime,
      avgResolutionTime,
      avgApprovalTime,
      breachesByType,
      breachesByPriority,
      breachesByCategory,
      reportPeriod: {
        startDate: startDate || new Date(0),
        endDate: endDate || new Date(),
      },
    };
  }
}

export default new SLARepository();
