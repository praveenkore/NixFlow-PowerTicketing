/**
 * SLA Policy Service - Business logic for SLA Policy operations
 * 
 * This service handles validation and business logic for SLA Policy CRUD operations,
 * including duplicate policy checking and validation of policy parameters.
 */

import slaRepository from '../repositories/sla.repository';
import {
  SLAPolicyInput,
  SLAPolicyUpdateInput,
  SLAPolicyWithRelations,
  SLAPolicyMatchCriteria,
} from '../types/sla.types';

export class SLAPolicyService {
  /**
   * Create a new SLA Policy with validation
   */
  async createSLAPolicy(data: SLAPolicyInput): Promise<SLAPolicyWithRelations> {
    // Validate time values
    if (data.responseTimeMins <= 0) {
      throw new Error('Response time must be greater than 0');
    }
    if (data.resolutionTimeMins <= 0) {
      throw new Error('Resolution time must be greater than 0');
    }
    if (data.approvalTimeMins !== undefined && data.approvalTimeMins <= 0) {
      throw new Error('Approval time must be greater than 0');
    }

    // Validate warning threshold
    const warningThreshold = data.warningThreshold ?? 0.8;
    if (warningThreshold < 0 || warningThreshold > 1) {
      throw new Error('Warning threshold must be between 0 and 1 (0% to 100%)');
    }

    // Check for duplicate policies
    const existingPolicies = await slaRepository.getSLAPolicies({
      isActive: true,
      category: data.category,
      priority: data.priority,
      workflowId: data.workflowId,
    });

    // Check if there's an exact match
    const exactMatch = existingPolicies.items.find(
      (p) =>
        p.category === data.category &&
        p.priority === data.priority &&
        p.workflowId === data.workflowId
    );

    if (exactMatch) {
      throw new Error(
        `An active SLA policy already exists for category=${data.category}, priority=${data.priority}, workflowId=${data.workflowId}`
      );
    }

    return await slaRepository.createSLAPolicy(data);
  }

  /**
   * Update an existing SLA Policy with validation
   */
  async updateSLAPolicy(id: number, data: SLAPolicyUpdateInput): Promise<SLAPolicyWithRelations> {
    // Check if policy exists
    const existingPolicy = await slaRepository.getSLAPolicyById(id);
    if (!existingPolicy) {
      throw new Error('SLA Policy not found');
    }

    // Validate time values if provided
    if (data.responseTimeMins !== undefined && data.responseTimeMins <= 0) {
      throw new Error('Response time must be greater than 0');
    }
    if (data.resolutionTimeMins !== undefined && data.resolutionTimeMins <= 0) {
      throw new Error('Resolution time must be greater than 0');
    }
    if (data.approvalTimeMins !== undefined && data.approvalTimeMins <= 0) {
      throw new Error('Approval time must be greater than 0');
    }

    // Validate warning threshold if provided
    if (data.warningThreshold !== undefined) {
      if (data.warningThreshold < 0 || data.warningThreshold > 1) {
        throw new Error('Warning threshold must be between 0 and 1 (0% to 100%)');
      }
    }

    // Check for duplicate policies if criteria is changing
    if (data.category !== undefined || data.priority !== undefined || data.workflowId !== undefined) {
      const category = data.category ?? existingPolicy.category ?? undefined;
      const priority = data.priority ?? existingPolicy.priority ?? undefined;
      const workflowId = data.workflowId ?? existingPolicy.workflowId ?? undefined;

      const existingPolicies = await slaRepository.getSLAPolicies({
        isActive: true,
        category,
        priority,
        workflowId,
      });

      // Check if there's an exact match (excluding current policy)
      const exactMatch = existingPolicies.items.find(
        (p) =>
          p.id !== id &&
          p.category === category &&
          p.priority === priority &&
          p.workflowId === workflowId
      );

      if (exactMatch) {
        throw new Error(
          `An active SLA policy already exists for category=${category}, priority=${priority}, workflowId=${workflowId}`
        );
      }
    }

    return await slaRepository.updateSLAPolicy(id, data);
  }

  /**
   * Delete an SLA Policy with validation
   */
  async deleteSLAPolicy(id: number): Promise<void> {
    // Check if policy exists
    const existingPolicy = await slaRepository.getSLAPolicyById(id);
    if (!existingPolicy) {
      throw new Error('SLA Policy not found');
    }

    // Check if there are active tickets using this policy
    const metrics = await slaRepository.getSLAMetrics({ slaPolicyId: id });
    const activeMetrics = metrics.items.filter((m) => m.status === 'WithinSLA' || m.status === 'Warning');

    if (activeMetrics.length > 0) {
      throw new Error(
        `Cannot delete SLA Policy: ${activeMetrics.length} active ticket(s) are using this policy`
      );
    }

    await slaRepository.deleteSLAPolicy(id);
  }

  /**
   * Get SLA Policies with filters
   */
  async getSLAPolicies(filters: {
    isActive?: boolean;
    category?: any;
    priority?: any;
    workflowId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SLAPolicyWithRelations[]; total: number; page: number; pageSize: number }> {
    return await slaRepository.getSLAPolicies(filters);
  }

  /**
   * Get a specific SLA Policy by ID
   */
  async getSLAPolicyById(id: number): Promise<SLAPolicyWithRelations> {
    const policy = await slaRepository.getSLAPolicyById(id);
    if (!policy) {
      throw new Error('SLA Policy not found');
    }
    return policy;
  }

  /**
   * Find matching SLA Policy for a ticket
   */
  async findMatchingSLAPolicy(criteria: SLAPolicyMatchCriteria): Promise<SLAPolicyWithRelations | null> {
    return await slaRepository.findMatchingSLAPolicy(criteria);
  }
}

export default new SLAPolicyService();
