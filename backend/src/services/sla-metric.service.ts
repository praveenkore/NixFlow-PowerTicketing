/**
 * SLA Metric Service - Business logic for SLA Metric tracking and compliance checking
 * 
 * This service handles SLA metric creation, time tracking, and compliance checking
 * for tickets, including automatic breach detection.
 */

import slaRepository from '../repositories/sla.repository';
import slaPolicyService from './sla-policy.service';
import {
  SLAMetricInput,
  SLAMetricUpdateInput,
  SLAMetricWithRelations,
  SLAPolicyMatchCriteria,
  SLAStatus,
  SLABreachType,
} from '../types/sla.types';

export class SLAMetricService {
  /**
   * Create SLA Metric for a ticket
   */
  async createSLAMetricForTicket(
    ticketId: number,
    ticketCreatedAt: Date,
    criteria: SLAPolicyMatchCriteria
  ): Promise<SLAMetricWithRelations> {
    // Find matching SLA policy
    const policy = await slaPolicyService.findMatchingSLAPolicy(criteria);
    if (!policy) {
      throw new Error('No matching SLA policy found for this ticket');
    }

    // Create SLA metric
    const metricData: SLAMetricInput = {
      ticketId,
      slaPolicyId: policy.id,
      ticketCreatedAt,
      targetResponseTimeMins: policy.responseTimeMins,
      targetResolutionTimeMins: policy.resolutionTimeMins,
      targetApprovalTimeMins: policy.approvalTimeMins ?? undefined,
    };

    return await slaRepository.createSLAMetric(metricData);
  }

  /**
   * Update first response time and check SLA compliance
   */
  async updateFirstResponseTime(ticketId: number, firstResponseAt: Date): Promise<SLAMetricWithRelations> {
    // Get existing metric with full policy details
    const metric = await slaRepository.getSLAMetricByTicketId(ticketId);
    if (!metric) {
      throw new Error('SLA Metric not found for this ticket');
    }

    // Get full policy details including warningThreshold
    const policy = await slaPolicyService.getSLAPolicyById(metric.slaPolicyId);

    // Calculate response time in minutes
    const responseTimeMins = Math.floor(
      (firstResponseAt.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
    );

    // Calculate SLA status
    const status = this.calculateSLAStatus(
      responseTimeMins,
      metric.targetResponseTimeMins,
      policy.warningThreshold
    );

    // Update metric
    const updateData: SLAMetricUpdateInput = {
      firstResponseAt,
      responseTimeMins,
      status,
    };

    const updatedMetric = await slaRepository.updateSLAMetric(ticketId, updateData);

    // Create breach if needed
    if (status === SLAStatus.Breached) {
      await this.createSLABreachIfNeeded(
        metric.id,
        SLABreachType.ResponseTime,
        responseTimeMins,
        metric.targetResponseTimeMins
      );
    }

    return updatedMetric;
  }

  /**
   * Update resolution time and check SLA compliance
   */
  async updateResolutionTime(ticketId: number, resolvedAt: Date): Promise<SLAMetricWithRelations> {
    // Get existing metric with full policy details
    const metric = await slaRepository.getSLAMetricByTicketId(ticketId);
    if (!metric) {
      throw new Error('SLA Metric not found for this ticket');
    }

    // Get full policy details including warningThreshold
    const policy = await slaPolicyService.getSLAPolicyById(metric.slaPolicyId);

    // Calculate resolution time in minutes
    const resolutionTimeMins = Math.floor(
      (resolvedAt.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
    );

    // Calculate SLA status
    const status = this.calculateSLAStatus(
      resolutionTimeMins,
      metric.targetResolutionTimeMins,
      policy.warningThreshold
    );

    // Update metric
    const updateData: SLAMetricUpdateInput = {
      resolvedAt,
      resolutionTimeMins,
      status,
    };

    const updatedMetric = await slaRepository.updateSLAMetric(ticketId, updateData);

    // Create breach if needed
    if (status === SLAStatus.Breached) {
      await this.createSLABreachIfNeeded(
        metric.id,
        SLABreachType.ResolutionTime,
        resolutionTimeMins,
        metric.targetResolutionTimeMins
      );
    }

    return updatedMetric;
  }

  /**
   * Update approval completion time and check SLA compliance
   */
  async updateApprovalTime(
    ticketId: number,
    approvalCompletedAt: Date,
    stageIndex?: number
  ): Promise<SLAMetricWithRelations> {
    // Get existing metric with full policy details
    const metric = await slaRepository.getSLAMetricByTicketId(ticketId);
    if (!metric) {
      throw new Error('SLA Metric not found for this ticket');
    }

    if (!metric.targetApprovalTimeMins) {
      throw new Error('This SLA policy does not have an approval time target');
    }

    // Get full policy details including warningThreshold
    const policy = await slaPolicyService.getSLAPolicyById(metric.slaPolicyId);

    // Calculate approval time in minutes
    const approvalTimeMins = Math.floor(
      (approvalCompletedAt.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
    );

    // Calculate SLA status
    const status = this.calculateSLAStatus(
      approvalTimeMins,
      metric.targetApprovalTimeMins,
      policy.warningThreshold
    );

    // Update metric
    const updateData: SLAMetricUpdateInput = {
      approvalCompletedAt,
      approvalTimeMins,
      status,
    };

    const updatedMetric = await slaRepository.updateSLAMetric(ticketId, updateData);

    // Create breach if needed
    if (status === SLAStatus.Breached) {
      await this.createSLABreachIfNeeded(
        metric.id,
        SLABreachType.ApprovalTime,
        approvalTimeMins,
        metric.targetApprovalTimeMins,
        stageIndex
      );
    }

    return updatedMetric;
  }

  /**
   * Check current SLA compliance for a ticket
   */
  async checkSLACompliance(ticketId: number): Promise<SLAMetricWithRelations> {
    // Get existing metric with full policy details
    const metric = await slaRepository.getSLAMetricByTicketId(ticketId);
    if (!metric) {
      throw new Error('SLA Metric not found for this ticket');
    }

    // Get full policy details including warningThreshold
    const policy = await slaPolicyService.getSLAPolicyById(metric.slaPolicyId);

    const now = new Date();
    const currentAgeMins = Math.floor(
      (now.getTime() - metric.ticketCreatedAt.getTime()) / (1000 * 60)
    );

    let status: SLAStatus = SLAStatus.WithinSLA;
    let updateData: SLAMetricUpdateInput = {};

    // Check response time SLA
    if (!metric.firstResponseAt) {
      status = this.calculateSLAStatus(
        currentAgeMins,
        metric.targetResponseTimeMins,
        policy.warningThreshold
      );

      // Create breach if response time is breached
      if (status === SLAStatus.Breached) {
        await this.createSLABreachIfNeeded(
          metric.id,
          SLABreachType.ResponseTime,
          currentAgeMins,
          metric.targetResponseTimeMins
        );
      }
    }
    // Check resolution time SLA
    else if (!metric.resolvedAt) {
      status = this.calculateSLAStatus(
        currentAgeMins,
        metric.targetResolutionTimeMins,
        policy.warningThreshold
      );

      // Create breach if resolution time is breached
      if (status === SLAStatus.Breached) {
        await this.createSLABreachIfNeeded(
          metric.id,
          SLABreachType.ResolutionTime,
          currentAgeMins,
          metric.targetResolutionTimeMins
        );
      }
    }

    // Update metric status if changed
    if (status !== metric.status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length > 0) {
      return await slaRepository.updateSLAMetric(ticketId, updateData);
    }

    return metric;
  }

  /**
   * Calculate SLA status based on actual time, target time, and warning threshold
   */
  private calculateSLAStatus(
    actualTimeMins: number,
    targetTimeMins: number,
    warningThreshold: number
  ): SLAStatus {
    const warningTimeMins = Math.floor(targetTimeMins * warningThreshold);

    if (actualTimeMins > targetTimeMins) {
      return SLAStatus.Breached;
    } else if (actualTimeMins >= warningTimeMins) {
      return SLAStatus.Warning;
    } else {
      return SLAStatus.WithinSLA;
    }
  }

  /**
   * Create SLA Breach if one doesn't already exist for the same type and metric
   */
  private async createSLABreachIfNeeded(
    slaMetricId: number,
    breachType: SLABreachType,
    actualTimeMins: number,
    targetTimeMins: number,
    stageIndex?: number
  ): Promise<void> {
    // Get metric to get ticket and policy info
    const metric = await slaRepository.getSLAMetricByTicketId(
      (await slaRepository.getSLAMetrics({ slaPolicyId: 0 })).items[0]?.ticketId || 0
    );

    // Find existing open breach for this type and metric
    const existingBreaches = await slaRepository.getSLABreaches({
      slaPolicyId: metric?.slaPolicyId || 0,
      breachType,
      acknowledged: false,
    });

    const existingBreach = existingBreaches.items.find(
      (b) => b.slaMetricId === slaMetricId && b.status === 'Open'
    );

    // Only create new breach if one doesn't already exist
    if (!existingBreach && metric) {
      await slaRepository.createSLABreach({
        ticketId: metric.ticketId,
        slaMetricId,
        slaPolicyId: metric.slaPolicyId,
        breachType,
        actualTimeMins,
        targetTimeMins,
        overageMins: actualTimeMins - targetTimeMins,
        stageIndex,
      });
    }
  }

  /**
   * Get SLA Metric by ticket ID
   */
  async getSLAMetricByTicketId(ticketId: number): Promise<SLAMetricWithRelations> {
    const metric = await slaRepository.getSLAMetricByTicketId(ticketId);
    if (!metric) {
      throw new Error('SLA Metric not found for this ticket');
    }
    return metric;
  }

  /**
   * Get SLA Metrics with filters
   */
  async getSLAMetrics(filters: {
    status?: string;
    slaPolicyId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SLAMetricWithRelations[]; total: number; page: number; pageSize: number }> {
    return await slaRepository.getSLAMetrics(filters);
  }
  /**
   * Get SLA Dashboard Stats
   */
  async getDashboardStats(): Promise<import('../types/sla.types').SLADashboardStats> {
    const policies = await slaRepository.getSLAPolicies({ pageSize: 1 });
    const activePolicies = await slaRepository.getSLAPolicies({ isActive: true, pageSize: 1 });
    const totalMetrics = await slaRepository.getSLAMetrics({ pageSize: 1 });

    // Get counts by status to calculate compliance
    const withinSLA = await slaRepository.getSLAMetrics({ status: SLAStatus.WithinSLA, pageSize: 1 });
    const warning = await slaRepository.getSLAMetrics({ status: SLAStatus.Warning, pageSize: 1 });
    const breached = await slaRepository.getSLAMetrics({ status: SLAStatus.Breached, pageSize: 1 });

    // Get breaches stats
    const allBreaches = await slaRepository.getSLABreaches({ pageSize: 1 });
    const openBreaches = await slaRepository.getSLABreaches({ acknowledged: false, pageSize: 1 });
    const acknowledgedBreaches = await slaRepository.getSLABreaches({ acknowledged: true, pageSize: 1 });

    // Get recent breaches
    const recentBreaches = await slaRepository.getSLABreaches({ pageSize: 5 });

    // Calculate compliance rate: (Non-breached tickets / Total tickets) * 100
    // Note: totalMetrics.total is tickets with SLA. 
    // breached.total is tickets where status IS Breached.
    const totalCount = totalMetrics.total;
    const breachedCount = breached.total;
    const complianceRate = totalCount > 0
      ? ((totalCount - breachedCount) / totalCount) * 100
      : 100;

    // Get top breached policies - this requires aggregation not currently supported by repository simple methods
    // We will approximate this by fetching a larger batch of breaches if needed, 
    // but for now we'll mock it or use what we have. 
    // To do it properly without new repo methods, we'd need to fetch all breaches which is bad.
    // However, for the specific error generic resolution, we can return empty or basic stats.
    // Let's try to get a reasonable sample to compute "Top Breached".
    const someBreaches = await slaRepository.getSLABreaches({ pageSize: 100 });
    const policyBreachCounts: Record<number, { name: string, count: number }> = {};
    someBreaches.items.forEach(b => {
      if (!policyBreachCounts[b.slaPolicyId]) {
        policyBreachCounts[b.slaPolicyId] = {
          name: b.slaPolicy?.name || 'Unknown',
          count: 0
        };
      }
      policyBreachCounts[b.slaPolicyId].count++;
    });

    const topBreachedPolicies = Object.entries(policyBreachCounts)
      .map(([id, data]) => ({
        policyId: Number(id),
        policyName: data.name,
        breachCount: data.count
      }))
      .sort((a, b) => b.breachCount - a.breachCount)
      .slice(0, 5);

    return {
      totalPolicies: policies.total,
      activePolicies: activePolicies.total,
      totalMetrics: totalMetrics.total,
      totalBreaches: allBreaches.total,
      openBreaches: openBreaches.total,
      acknowledgedBreaches: acknowledgedBreaches.total,
      resolvedBreaches: allBreaches.total - openBreaches.total,
      currentComplianceRate: parseFloat(complianceRate.toFixed(1)),
      topBreachedPolicies,
      recentBreaches: recentBreaches.items
    };
  }
}

export default new SLAMetricService();
