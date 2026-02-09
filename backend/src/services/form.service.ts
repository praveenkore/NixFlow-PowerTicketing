/**
 * Form Service - Business logic for the Web Form Builder module
 */

import { PrismaClient, CustomForm, FormField, FormSubmission, FormStatus, FormSubmissionStatus, Category, Priority } from '@prisma/client';
import {
  CustomFormDefinition,
  FormCreateRequest,
  FormUpdateRequest,
  FormFieldDefinition,
  FormSubmissionData,
  FormSubmissionRequest,
  FormSubmissionResponse,
  FormConvertedEventData,
  FormSubmittedEventData,
  FormBuilderEventType,
  FormAnalyticsData,
  DailyFormStats,
} from '../types/form.types';
import { EventBus } from '../events/event-bus';

export class FormService {
  private prisma: PrismaClient;
  private eventBus: EventBus;

  constructor(prisma: PrismaClient, eventBus: EventBus) {
    this.prisma = prisma;
    this.eventBus = eventBus;
  }

  // ============================================
  // Form Management
  // ============================================

  /**
   * Generate a URL-friendly slug from a form name
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }

  /**
   * Serialize form field for database storage
   */
  private serializeField(field: FormFieldDefinition): any {
    return {
      name: field.name,
      label: field.label,
      type: field.type,
      order: field.order,
      config: field.config ? JSON.stringify(field.config) : null,
      options: field.options ? JSON.stringify(field.options) : null,
      validation: field.validation ? JSON.stringify(field.validation) : null,
      conditionalLogic: field.conditionalLogic ? JSON.stringify(field.conditionalLogic) : null,
      helpText: field.helpText,
      placeholder: field.placeholder,
      width: field.width || 'full',
      defaultValue: field.defaultValue,
      mapsToTicketField: field.mapsToTicketField,
    };
  }

  /**
   * Deserialize form field from database
   */
  private deserializeField(field: FormField): FormFieldDefinition {
    return {
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
      order: field.order,
      config: field.config ? JSON.parse(field.config) : undefined,
      options: field.options ? JSON.parse(field.options) : undefined,
      validation: field.validation ? JSON.parse(field.validation) : undefined,
      conditionalLogic: field.conditionalLogic ? JSON.parse(field.conditionalLogic) : undefined,
      helpText: field.helpText || undefined,
      placeholder: field.placeholder || undefined,
      width: field.width as 'full' | 'half' | 'third' | 'quarter',
      defaultValue: field.defaultValue || undefined,
      mapsToTicketField: field.mapsToTicketField || undefined,
    };
  }

  /**
   * Deserialize complete form from database
   */
  private deserializeForm(form: CustomForm & { fields: FormField[] }): CustomFormDefinition {
    return {
      id: form.id,
      name: form.name,
      description: form.description || undefined,
      slug: form.slug,
      status: form.status,
      category: form.category,
      defaultPriority: form.defaultPriority,
      defaultAssigneeId: form.defaultAssigneeId || undefined,
      fields: form.fields.map(f => this.deserializeField(f)),
      successMessage: form.successMessage,
      submitButtonText: form.submitButtonText,
      enableCaptcha: form.enableCaptcha,
      allowAnonymous: form.allowAnonymous,
      isTemplate: form.isTemplate,
      templateCategory: form.templateCategory || undefined,
      clonedFromId: form.clonedFromId || undefined,
      createdById: form.createdById,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
    };
  }

  /**
   * Create a new form
   */
  async createForm(request: FormCreateRequest, createdById: number): Promise<CustomFormDefinition> {
    const slug = this.generateSlug(request.name);

    const form = await this.prisma.customForm.create({
      data: {
        name: request.name,
        description: request.description,
        slug,
        status: FormStatus.Draft,
        category: request.category,
        defaultPriority: request.defaultPriority || Priority.Medium,
        defaultAssigneeId: request.defaultAssigneeId,
        successMessage: request.successMessage,
        submitButtonText: request.submitButtonText,
        enableCaptcha: request.enableCaptcha ?? false,
        allowAnonymous: request.allowAnonymous ?? false,
        createdById,
        fields: {
          create: request.fields.map((field, index) => ({
            ...this.serializeField(field),
            order: field.order ?? index,
          })),
        },
      },
      include: { fields: true },
    });

    // Emit event
    await this.eventBus.emit(FormBuilderEventType.FORM_CREATED, {
      formId: form.id,
      formName: form.name,
      category: form.category,
      createdBy: createdById,
    });

    return this.deserializeForm(form);
  }

  /**
   * Update an existing form
   */
  async updateForm(formId: number, request: FormUpdateRequest): Promise<CustomFormDefinition> {
    const existingForm = await this.prisma.customForm.findUnique({
      where: { id: formId },
      include: { fields: true },
    });

    if (!existingForm) {
      throw new Error('Form not found');
    }

    // Build update data
    const updateData: any = {};
    if (request.name !== undefined) updateData.name = request.name;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.status !== undefined) updateData.status = request.status;
    if (request.category !== undefined) updateData.category = request.category;
    if (request.defaultPriority !== undefined) updateData.defaultPriority = request.defaultPriority;
    if (request.defaultAssigneeId !== undefined) updateData.defaultAssigneeId = request.defaultAssigneeId;
    if (request.successMessage !== undefined) updateData.successMessage = request.successMessage;
    if (request.submitButtonText !== undefined) updateData.submitButtonText = request.submitButtonText;
    if (request.enableCaptcha !== undefined) updateData.enableCaptcha = request.enableCaptcha;
    if (request.allowAnonymous !== undefined) updateData.allowAnonymous = request.allowAnonymous;

    // Handle field updates if provided
    if (request.fields) {
      // Delete existing fields and recreate
      await this.prisma.formField.deleteMany({
        where: { formId },
      });

      updateData.fields = {
        create: request.fields.map((field, index) => ({
          ...this.serializeField(field),
          order: field.order ?? index,
        })),
      };
    }

    const form = await this.prisma.customForm.update({
      where: { id: formId },
      data: updateData,
      include: { fields: true },
    });

    // Emit event based on status change
    if (request.status === FormStatus.Published) {
      await this.eventBus.emit(FormBuilderEventType.FORM_PUBLISHED, {
        formId: form.id,
        formName: form.name,
      });
    } else if (request.status === FormStatus.Archived) {
      await this.eventBus.emit(FormBuilderEventType.FORM_ARCHIVED, {
        formId: form.id,
        formName: form.name,
      });
    } else {
      await this.eventBus.emit(FormBuilderEventType.FORM_UPDATED, {
        formId: form.id,
        formName: form.name,
      });
    }

    return this.deserializeForm(form);
  }

  /**
   * Get a form by ID
   */
  async getFormById(formId: number): Promise<CustomFormDefinition | null> {
    const form = await this.prisma.customForm.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });

    if (!form) return null;
    return this.deserializeForm(form);
  }

  /**
   * Get a form by slug (for public access)
   */
  async getFormBySlug(slug: string): Promise<CustomFormDefinition | null> {
    const form = await this.prisma.customForm.findUnique({
      where: { slug },
      include: { fields: { orderBy: { order: 'asc' } } },
    });

    if (!form) return null;
    return this.deserializeForm(form);
  }

  /**
   * Get all forms with optional filtering
   */
  async getForms(filters?: {
    status?: FormStatus;
    category?: Category;
    isTemplate?: boolean;
    createdById?: number;
  }): Promise<CustomFormDefinition[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.isTemplate !== undefined) where.isTemplate = filters.isTemplate;
    if (filters?.createdById) where.createdById = filters.createdById;

    const forms = await this.prisma.customForm.findMany({
      where,
      include: { fields: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });

    return forms.map(f => this.deserializeForm(f));
  }

  /**
   * Delete a form
   */
  async deleteForm(formId: number): Promise<void> {
    await this.prisma.customForm.delete({
      where: { id: formId },
    });
  }

  /**
   * Clone a form (including from templates)
   */
  async cloneForm(formId: number, newName: string, createdById: number): Promise<CustomFormDefinition> {
    const sourceForm = await this.prisma.customForm.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });

    if (!sourceForm) {
      throw new Error('Source form not found');
    }

    const slug = this.generateSlug(newName);

    const clonedForm = await this.prisma.customForm.create({
      data: {
        name: newName,
        description: sourceForm.description,
        slug,
        status: FormStatus.Draft,
        category: sourceForm.category,
        defaultPriority: sourceForm.defaultPriority,
        defaultAssigneeId: sourceForm.defaultAssigneeId,
        successMessage: sourceForm.successMessage,
        submitButtonText: sourceForm.submitButtonText,
        enableCaptcha: sourceForm.enableCaptcha,
        allowAnonymous: sourceForm.allowAnonymous,
        isTemplate: false,
        clonedFromId: formId,
        createdById,
        fields: {
          create: sourceForm.fields.map((field, index) => ({
            name: field.name,
            label: field.label,
            type: field.type,
            order: index,
            config: field.config,
            options: field.options,
            validation: field.validation,
            conditionalLogic: field.conditionalLogic,
            helpText: field.helpText,
            placeholder: field.placeholder,
            width: field.width,
            defaultValue: field.defaultValue,
            mapsToTicketField: field.mapsToTicketField,
          })),
        },
      },
      include: { fields: true },
    });

    return this.deserializeForm(clonedForm);
  }

  // ============================================
  // Form Submission
  // ============================================

  /**
   * Validate form submission data
   */
  private validateSubmission(form: CustomFormDefinition, data: FormSubmissionData): string[] {
    const errors: string[] = [];

    for (const field of form.fields) {
      const value = data[field.name];
      const validation = field.validation;

      if (!validation) continue;

      // Required check
      if (validation.required) {
        const isEmpty = value === null || value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          errors.push(validation.customErrorMessage || `${field.label} is required`);
          continue;
        }
      }

      // Skip further validation if value is empty and not required
      if (value === null || value === undefined || value === '') {
        continue;
      }

      const strValue = String(value);

      // Min length check
      if (validation.minLength && strValue.length < validation.minLength) {
        errors.push(`${field.label} must be at least ${validation.minLength} characters`);
      }

      // Max length check
      if (validation.maxLength && strValue.length > validation.maxLength) {
        errors.push(`${field.label} must be no more than ${validation.maxLength} characters`);
      }

      // Pattern check
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(strValue)) {
          errors.push(validation.customErrorMessage || `${field.label} format is invalid`);
        }
      }

      // Email check
      if (validation.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strValue)) {
          errors.push(`${field.label} must be a valid email address`);
        }
      }

      // URL check
      if (validation.url) {
        try {
          new URL(strValue);
        } catch {
          errors.push(`${field.label} must be a valid URL`);
        }
      }

      // Min/Max for numbers
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          errors.push(`${field.label} must be at least ${validation.min}`);
        }
        if (validation.max !== undefined && value > validation.max) {
          errors.push(`${field.label} must be no more than ${validation.max}`);
        }
      }
    }

    return errors;
  }

  /**
   * Submit a form
   */
  async submitForm(
    request: FormSubmissionRequest,
    submitterId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<FormSubmissionResponse> {
    const form = await this.getFormBySlug(request.formSlug);

    if (!form) {
      throw new Error('Form not found');
    }

    if (form.status !== FormStatus.Published) {
      throw new Error('Form is not currently accepting submissions');
    }

    // Validate submission
    const validationErrors = this.validateSubmission(form, request.data);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Create submission
    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id!,
        data: JSON.stringify(request.data),
        status: FormSubmissionStatus.Pending,
        submitterId,
        submitterName: request.submitterName,
        submitterEmail: request.submitterEmail,
        submitterPhone: request.submitterPhone,
        ipAddress,
        userAgent,
      },
    });

    // Emit event
    await this.eventBus.emit(FormBuilderEventType.FORM_SUBMITTED, {
      submissionId: submission.id,
      formId: form.id,
      formName: form.name,
      category: form.category,
      submitterId,
      submitterEmail: request.submitterEmail,
    } as FormSubmittedEventData);

    // Update analytics
    await this.incrementSubmissionCount(form.id!);

    return {
      id: submission.id,
      formId: form.id!,
      status: FormSubmissionStatus.Pending,
      message: form.successMessage || 'Thank you for your submission.',
    };
  }

  /**
   * Convert a form submission to a ticket
   */
  async convertSubmissionToTicket(
    submissionId: number,
    convertedById: number
  ): Promise<{ ticketId: number; ticketNumber: string }> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { form: { include: { fields: true } } },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.status === FormSubmissionStatus.Converted) {
      throw new Error('Submission has already been converted to a ticket');
    }

    const form = submission.form;
    const formData = JSON.parse(submission.data) as FormSubmissionData;

    // Extract title and description from form data
    let title = '';
    let description = '';

    // Look for fields mapped to title/description
    for (const field of form.fields) {
      const value = formData[field.name];
      if (!value) continue;

      if (field.mapsToTicketField === 'title') {
        title = String(value);
      } else if (field.mapsToTicketField === 'description') {
        description = String(value);
      }
    }

    // If no mapped fields found, use first text field as title and textarea as description
    if (!title) {
      const titleField = form.fields.find(f =>
        f.type === 'TEXT' && !f.mapsToTicketField
      );
      if (titleField && formData[titleField.name]) {
        title = String(formData[titleField.name]);
      }
    }

    if (!description) {
      const descField = form.fields.find(f =>
        f.type === 'TEXTAREA' && !f.mapsToTicketField
      );
      if (descField && formData[descField.name]) {
        description = String(formData[descField.name]);
      }
    }

    // Fallback values
    if (!title) title = `Form Submission - ${form.name}`;
    if (!description) description = 'No description provided.';

    // Add all form data to description as formatted text
    const formDataSummary = form.fields
      .filter(f => formData[f.name] && f.mapsToTicketField !== 'title' && f.mapsToTicketField !== 'description')
      .map(f => {
        const value = formData[f.name];
        let displayValue = String(value);
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        }
        return `**${f.label}:** ${displayValue}`;
      })
      .join('\n');

    if (formDataSummary) {
      description += `\n\n---\n\n**Additional Information:**\n\n${formDataSummary}`;
    }

    // Generate ticket ID
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const count = await this.prisma.ticket.count({ where: { createdAt: { gte: todayStart } } });
    const sequence = String(count + 1).padStart(4, '0');
    const ticketNumber = `TKT-${datePart}-${sequence}`;

    // Determine assignee
    const assigneeId = form.defaultAssigneeId || convertedById;

    // Determine requestor
    const requestorId = submission.submitterId || convertedById;

    // Create ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketId: ticketNumber,
        title,
        description,
        requestorId,
        assigneeId,
        status: 'InApproval' as any,
        priority: form.defaultPriority,
        category: form.category,
        historyLogs: {
          create: {
            action: 'Created from Form',
            details: `Ticket created from form submission #${submission.id} (${form.name})`,
            userId: convertedById,
          },
        },
      },
    });

    // Update submission status
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: FormSubmissionStatus.Converted,
        ticketId: ticket.id,
        convertedAt: new Date(),
        convertedById,
      },
    });

    // Update analytics
    await this.incrementConversionCount(form.id);

    // Emit event
    await this.eventBus.emit(FormBuilderEventType.FORM_CONVERTED, {
      submissionId: submission.id,
      ticketId: ticket.id,
      ticketNumber,
      formId: form.id,
      formName: form.name,
      convertedBy: convertedById,
    } as FormConvertedEventData);

    return { ticketId: ticket.id, ticketNumber };
  }

  /**
   * Get form submissions
   */
  async getSubmissions(formId?: number, status?: FormSubmissionStatus): Promise<any[]> {
    const where: any = {};
    if (formId) where.formId = formId;
    if (status) where.status = status;

    const submissions = await this.prisma.formSubmission.findMany({
      where,
      include: {
        form: { select: { name: true } },
        submitter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions.map(s => ({
      id: s.id,
      formId: s.formId,
      formName: s.form.name,
      data: JSON.parse(s.data),
      status: s.status,
      ticketId: s.ticketId,
      submitterId: s.submitterId,
      submitterName: s.submitter?.name || s.submitterName,
      submitterEmail: s.submitter?.email || s.submitterEmail,
      createdAt: s.createdAt,
      convertedAt: s.convertedAt,
    }));
  }

  // ============================================
  // Form Analytics
  // ============================================

  /**
   * Increment form view count
   */
  async incrementViewCount(formId: number): Promise<void> {
    await this.prisma.formAnalytics.upsert({
      where: { formId },
      create: {
        formId,
        viewCount: 1,
      },
      update: {
        viewCount: { increment: 1 },
      },
    });
  }

  /**
   * Increment form submission count
   */
  private async incrementSubmissionCount(formId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.prisma.formAnalytics.upsert({
      where: { formId },
      create: {
        formId,
        submissionCount: 1,
        lastSubmittedAt: new Date(),
        dailyStats: JSON.stringify([{ date: today, views: 0, submissions: 1, conversions: 0 }]),
      },
      update: {
        submissionCount: { increment: 1 },
        lastSubmittedAt: new Date(),
      },
    });
  }

  /**
   * Increment form conversion count
   */
  private async incrementConversionCount(formId: number): Promise<void> {
    await this.prisma.formAnalytics.upsert({
      where: { formId },
      create: {
        formId,
        conversionCount: 1,
      },
      update: {
        conversionCount: { increment: 1 },
      },
    });
  }

  /**
   * Get form analytics
   */
  async getFormAnalytics(formId: number): Promise<FormAnalyticsData | null> {
    const analytics = await this.prisma.formAnalytics.findUnique({
      where: { formId },
    });

    if (!analytics) {
      return null;
    }

    const conversionRate = analytics.viewCount > 0
      ? (analytics.conversionCount / analytics.viewCount) * 100
      : 0;

    const abandonmentRate = analytics.viewCount > 0
      ? ((analytics.viewCount - analytics.submissionCount) / analytics.viewCount) * 100
      : 0;

    let dailyStats: DailyFormStats[] = [];
    if (analytics.dailyStats) {
      try {
        const parsed = JSON.parse(analytics.dailyStats);
        dailyStats = parsed.map((d: any) => ({
          ...d,
          abandonmentRate: d.views > 0 ? ((d.views - d.submissions) / d.views) * 100 : 0,
        }));
      } catch {
        // Ignore parse errors
      }
    }

    return {
      formId: analytics.formId,
      viewCount: analytics.viewCount,
      submissionCount: analytics.submissionCount,
      conversionCount: analytics.conversionCount,
      conversionRate,
      abandonmentRate,
      avgCompletionTimeSecs: analytics.avgCompletionTimeSecs,
      lastSubmittedAt: analytics.lastSubmittedAt || undefined,
      dailyStats,
    };
  }

  // ============================================
  // Form Templates
  // ============================================

  /**
   * Create a form template
   */
  async createTemplate(formId: number, templateCategory: string): Promise<CustomFormDefinition> {
    const form = await this.prisma.customForm.update({
      where: { id: formId },
      data: {
        isTemplate: true,
        templateCategory,
      },
      include: { fields: true },
    });

    return this.deserializeForm(form);
  }

  /**
   * Get form templates
   */
  async getTemplates(category?: string): Promise<CustomFormDefinition[]> {
    const where: any = { isTemplate: true };
    if (category) where.templateCategory = category;

    const forms = await this.prisma.customForm.findMany({
      where,
      include: { fields: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });

    return forms.map(f => this.deserializeForm(f));
  }
}
