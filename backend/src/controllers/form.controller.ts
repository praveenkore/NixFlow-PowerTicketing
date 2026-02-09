/**
 * Form Controller - HTTP request handlers for the Web Form Builder module
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FormService } from '../services/form.service';
import { EventBus, getEventBus } from '../events/event-bus';
import {
  FormCreateRequest,
  FormUpdateRequest,
  FormSubmissionRequest,
  FormFieldType,
  AVAILABLE_FIELD_TYPES,
} from '../types/form.types';

export class FormController {
  private formService: FormService;

  constructor(prisma: PrismaClient, eventBus: EventBus) {
    this.formService = new FormService(prisma, eventBus);
  }

  // ============================================
  // Form CRUD Operations
  // ============================================

  /**
   * Create a new form
   */
  createForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: FormCreateRequest = req.body;
      const userId = req.user!.id;

      // Validate required fields
      if (!request.name || !request.category) {
        res.status(400).json({ error: 'Form name and category are required' });
        return;
      }

      if (!request.fields || request.fields.length === 0) {
        res.status(400).json({ error: 'At least one form field is required' });
        return;
      }

      const form = await this.formService.createForm(request, userId);
      res.status(201).json(form);
    } catch (error: any) {
      console.error('[FormController] Error creating form:', error);
      res.status(400).json({ error: error.message || 'Failed to create form' });
    }
  };

  /**
   * Update an existing form
   */
  updateForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const formId = parseInt(req.params.id);
      const request: FormUpdateRequest = req.body;

      if (isNaN(formId)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      const form = await this.formService.updateForm(formId, request);
      res.json(form);
    } catch (error: any) {
      console.error('[FormController] Error updating form:', error);
      if (error.message === 'Form not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to update form' });
      }
    }
  };

  /**
   * Get a form by ID
   */
  getFormById = async (req: Request, res: Response): Promise<void> => {
    try {
      const formId = parseInt(req.params.id);

      if (isNaN(formId)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      const form = await this.formService.getFormById(formId);

      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      res.json(form);
    } catch (error: any) {
      console.error('[FormController] Error getting form:', error);
      res.status(500).json({ error: error.message || 'Failed to get form' });
    }
  };

  /**
   * Get a form by slug (for public access)
   */
  getFormBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;

      const form = await this.formService.getFormBySlug(slug);

      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      // Only allow access to published forms (unless authenticated admin)
      if (form.status !== 'Published') {
        const user = req.user;
        if (!user) {
          res.status(403).json({ error: 'Form is not published' });
          return;
        }
      }

      // Track view
      await this.formService.incrementViewCount(form.id!);

      res.json(form);
    } catch (error: any) {
      console.error('[FormController] Error getting form by slug:', error);
      res.status(500).json({ error: error.message || 'Failed to get form' });
    }
  };

  /**
   * Get all forms
   */
  getForms = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, category, isTemplate, createdById } = req.query;

      const filters = {
        status: status as any,
        category: category as any,
        isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
        createdById: createdById ? parseInt(createdById as string) : undefined,
      };

      const forms = await this.formService.getForms(filters);
      res.json(forms);
    } catch (error: any) {
      console.error('[FormController] Error getting forms:', error);
      res.status(500).json({ error: error.message || 'Failed to get forms' });
    }
  };

  /**
   * Delete a form
   */
  deleteForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const formId = parseInt(req.params.id);

      if (isNaN(formId)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      await this.formService.deleteForm(formId);
      res.status(204).send();
    } catch (error: any) {
      console.error('[FormController] Error deleting form:', error);
      res.status(400).json({ error: error.message || 'Failed to delete form' });
    }
  };

  /**
   * Clone a form
   */
  cloneForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const formId = parseInt(req.params.id);
      const { name } = req.body;
      const userId = req.user!.id;

      if (isNaN(formId)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      if (!name) {
        res.status(400).json({ error: 'New form name is required' });
        return;
      }

      const form = await this.formService.cloneForm(formId, name, userId);
      res.status(201).json(form);
    } catch (error: any) {
      console.error('[FormController] Error cloning form:', error);
      if (error.message === 'Source form not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || 'Failed to clone form' });
      }
    }
  };

  // ============================================
  // Form Submission
  // ============================================

  /**
   * Submit a form
   */
  submitForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: FormSubmissionRequest = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      if (!request.formSlug) {
        res.status(400).json({ error: 'Form slug is required' });
        return;
      }

      if (!request.data) {
        res.status(400).json({ error: 'Form data is required' });
        return;
      }

      const response = await this.formService.submitForm(
        request,
        userId,
        ipAddress,
        userAgent
      );

      res.status(201).json(response);
    } catch (error: any) {
      console.error('[FormController] Error submitting form:', error);
      res.status(400).json({ error: error.message || 'Failed to submit form' });
    }
  };

  /**
   * Convert a submission to a ticket
   */
  convertSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const submissionId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(submissionId)) {
        res.status(400).json({ error: 'Invalid submission ID' });
        return;
      }

      const result = await this.formService.convertSubmissionToTicket(submissionId, userId);
      res.json(result);
    } catch (error: any) {
      console.error('[FormController] Error converting submission:', error);
      res.status(400).json({ error: error.message || 'Failed to convert submission' });
    }
  };

  /**
   * Get form submissions
   */
  getSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { formId, status } = req.query;

      const filters = {
        formId: formId ? parseInt(formId as string) : undefined,
        status: status as any,
      };

      const submissions = await this.formService.getSubmissions(
        filters.formId,
        filters.status
      );

      res.json(submissions);
    } catch (error: any) {
      console.error('[FormController] Error getting submissions:', error);
      res.status(500).json({ error: error.message || 'Failed to get submissions' });
    }
  };

  // ============================================
  // Form Analytics
  // ============================================

  /**
   * Get form analytics
   */
  getFormAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const formId = parseInt(req.params.id);

      if (isNaN(formId)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      const analytics = await this.formService.getFormAnalytics(formId);

      if (!analytics) {
        res.status(404).json({ error: 'No analytics found for this form' });
        return;
      }

      res.json(analytics);
    } catch (error: any) {
      console.error('[FormController] Error getting analytics:', error);
      res.status(500).json({ error: error.message || 'Failed to get analytics' });
    }
  };

  // ============================================
  // Form Templates
  // ============================================

  /**
   * Create a template from a form
   */
  createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const formId = parseInt(req.params.id);
      const { category } = req.body;

      if (isNaN(formId)) {
        res.status(400).json({ error: 'Invalid form ID' });
        return;
      }

      if (!category) {
        res.status(400).json({ error: 'Template category is required' });
        return;
      }

      const template = await this.formService.createTemplate(formId, category);
      res.json(template);
    } catch (error: any) {
      console.error('[FormController] Error creating template:', error);
      res.status(400).json({ error: error.message || 'Failed to create template' });
    }
  };

  /**
   * Get form templates
   */
  getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.query;
      const templates = await this.formService.getTemplates(category as string);
      res.json(templates);
    } catch (error: any) {
      console.error('[FormController] Error getting templates:', error);
      res.status(500).json({ error: error.message || 'Failed to get templates' });
    }
  };

  // ============================================
  // Field Types
  // ============================================

  /**
   * Get available field types
   */
  getFieldTypes = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json(AVAILABLE_FIELD_TYPES);
    } catch (error: any) {
      console.error('[FormController] Error getting field types:', error);
      res.status(500).json({ error: error.message || 'Failed to get field types' });
    }
  };
}

// Create and export controller instance
const prisma = new PrismaClient();
const eventBus = getEventBus();
const formController = new FormController(prisma, eventBus);

export default formController;
