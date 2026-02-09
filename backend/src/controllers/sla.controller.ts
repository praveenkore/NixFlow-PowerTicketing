/**
 * SLA Controller - HTTP endpoints for SLA operations
 * 
 * This controller handles all HTTP requests for SLA Policies, Metrics, Breaches,
 * and Reports, delegating business logic to service layers.
 */

import { Request, Response } from 'express';
import slaPolicyService from '../services/sla-policy.service';
import slaMetricService from '../services/sla-metric.service';
import slaReportService from '../services/sla-report.service';
import slaRepository from '../repositories/sla.repository';
import {
  SLAPolicyInput,
  SLAPolicyUpdateInput,
  SLAPolicyMatchCriteria,
} from '../types/sla.types';

export class SLAController {
  /**
   * Create a new SLA Policy
   * POST /api/sla/policies
   */
  async createSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, isActive, responseTimeMins, resolutionTimeMins, approvalTimeMins, warningThreshold, category, priority, workflowId } = req.body;

      const data: SLAPolicyInput = {
        name,
        description,
        isActive,
        responseTimeMins,
        resolutionTimeMins,
        approvalTimeMins,
        warningThreshold,
        category,
        priority,
        workflowId,
        createdById: req.user!.id,
      };

      const policy = await slaPolicyService.createSLAPolicy(data);
      res.status(201).json(policy);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get SLA Policies with filters
   * GET /api/sla/policies
   */
  async getSLAPolicies(req: Request, res: Response): Promise<void> {
    try {
      const { isActive, category, priority, workflowId, page, pageSize } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (category !== undefined) {
        filters.category = category;
      }
      if (priority !== undefined) {
        filters.priority = priority;
      }
      if (workflowId !== undefined) {
        filters.workflowId = Number(workflowId);
      }
      if (page !== undefined) {
        filters.page = Number(page);
      }
      if (pageSize !== undefined) {
        filters.pageSize = Number(pageSize);
      }

      const result = await slaPolicyService.getSLAPolicies(filters);
      const totalPages = Math.ceil(result.total / result.pageSize);

      // Transform response to match frontend expectations
      res.json({
        policies: result.items,
        pagination: {
          totalCount: result.total,
          totalPages,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get a specific SLA Policy by ID
   * GET /api/sla/policies/:id
   */
  async getSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const policyId = Number(id);
      if (isNaN(policyId)) {
        res.status(400).json({ error: 'Invalid Policy ID' });
        return;
      }
      const policy = await slaPolicyService.getSLAPolicyById(policyId);
      res.json(policy);
    } catch (err: any) {
      if (err.message === 'SLA Policy not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  }

  /**
   * Update an existing SLA Policy
   * PUT /api/sla/policies/:id
   */
  async updateSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const policyId = Number(id);
      if (isNaN(policyId)) {
        res.status(400).json({ error: 'Invalid Policy ID' });
        return;
      }
      const { name, description, isActive, responseTimeMins, resolutionTimeMins, approvalTimeMins, warningThreshold, category, priority, workflowId } = req.body;

      const data: SLAPolicyUpdateInput = {
        name,
        description,
        isActive,
        responseTimeMins,
        resolutionTimeMins,
        approvalTimeMins,
        warningThreshold,
        category,
        priority,
        workflowId,
      };

      const policy = await slaPolicyService.updateSLAPolicy(policyId, data);
      res.json(policy);
    } catch (err: any) {
      if (err.message === 'SLA Policy not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  }

  /**
   * Delete an SLA Policy
   * DELETE /api/sla/policies/:id
   */
  async deleteSLAPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const policyId = Number(id);
      if (isNaN(policyId)) {
        res.status(400).json({ error: 'Invalid Policy ID' });
        return;
      }
      await slaPolicyService.deleteSLAPolicy(policyId);
      res.status(204).send();
    } catch (err: any) {
      if (err.message === 'SLA Policy not found') {
        res.status(404).json({ error: err.message });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  }

  /**
   * Get SLA Metrics with filters
   * GET /api/sla/metrics
   */
  async getSLAMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { status, slaPolicyId, page, pageSize } = req.query;

      const filters: any = {};
      if (status !== undefined) {
        filters.status = status;
      }
      if (slaPolicyId !== undefined) {
        filters.slaPolicyId = Number(slaPolicyId);
      }
      if (page !== undefined) {
        filters.page = Number(page);
      }
      if (pageSize !== undefined) {
        filters.pageSize = Number(pageSize);
      }

      const result = await slaMetricService.getSLAMetrics(filters);
      const totalPages = Math.ceil(result.total / result.pageSize);

      // Transform response to match frontend expectations
      res.json({
        metrics: result.items,
        pagination: {
          totalCount: result.total,
          totalPages,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get SLA Metric for a specific ticket
   * GET /api/sla/metrics/ticket/:ticketId
   */
  async getSLAMetricByTicketId(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const metric = await slaMetricService.getSLAMetricByTicketId(Number(ticketId));
      res.json(metric);
    } catch (err: any) {
      if (err.message === 'SLA Metric not found for this ticket') {
        res.status(204).send();
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  }

  /**
   * Get SLA Breaches with filters
   * GET /api/sla/breaches
   */
  async getSLABreaches(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId, slaPolicyId, breachType, acknowledged, page, pageSize } = req.query;

      const filters: any = {};
      if (ticketId !== undefined) {
        filters.ticketId = Number(ticketId);
      }
      if (slaPolicyId !== undefined) {
        filters.slaPolicyId = Number(slaPolicyId);
      }
      if (breachType !== undefined) {
        filters.breachType = breachType;
      }
      if (acknowledged !== undefined) {
        filters.acknowledged = acknowledged === 'true';
      }
      if (page !== undefined) {
        filters.page = Number(page);
      }
      if (pageSize !== undefined) {
        filters.pageSize = Number(pageSize);
      }

      // Use repository's getSLABreaches method directly
      const result = await slaRepository.getSLABreaches(filters);
      const totalPages = Math.ceil(result.total / result.pageSize);

      // Transform response to match frontend expectations
      res.json({
        breaches: result.items,
        pagination: {
          totalCount: result.total,
          totalPages,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Acknowledge an SLA Breach
   * POST /api/sla/breaches/:id/acknowledge
   */
  async acknowledgeBreach(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;

      const data = {
        acknowledgedById: req.user!.id,
        resolutionNotes,
      };

      const breach = await slaRepository.acknowledgeBreach(Number(id), data);
      res.json(breach);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get SLA Compliance Report
   * GET /api/sla/reports/compliance
   */
  async getComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;

      const report = await slaReportService.getComplianceReport(startDateObj, endDateObj);
      res.json(report);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get SLA Dashboard Stats
   * GET /api/sla/dashboard/stats
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await slaMetricService.getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export default new SLAController();
