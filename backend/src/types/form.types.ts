/**
 * Type definitions for the Web Form Builder module
 */

import { FormFieldType, FormStatus, FormSubmissionStatus, Category, Priority } from '@prisma/client';

// Re-export Prisma enums for convenience
export { FormFieldType, FormStatus, FormSubmissionStatus, Category, Priority };

// ============================================
// Form Field Types
// ============================================

export interface FormFieldOption {
  label: string;
  value: string;
  color?: string;
}

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
  customErrorMessage?: string;
}

export interface FormFieldConfig {
  placeholder?: string;
  rows?: number;           // For TEXTAREA
  min?: number;            // For NUMBER, SLIDER
  max?: number;            // For NUMBER, SLIDER
  step?: number;           // For NUMBER, SLIDER
  multiple?: boolean;      // For FILE
  accept?: string;         // For FILE (e.g., ".pdf,.doc")
  showTime?: boolean;      // For DATETIME
  dateFormat?: string;     // For DATE, DATETIME
  maxFiles?: number;       // For FILE
  maxFileSize?: number;    // For FILE (in bytes)
}

export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value?: string | number | boolean;
}

export interface FormFieldConditionalLogic {
  showWhen?: ConditionalRule[];
  hideWhen?: ConditionalRule[];
  logicOperator?: 'AND' | 'OR';
}

export interface FormFieldDefinition {
  id?: number;
  name: string;
  label: string;
  type: FormFieldType;
  order: number;
  config?: FormFieldConfig;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  conditionalLogic?: FormFieldConditionalLogic;
  helpText?: string;
  placeholder?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: string;
  mapsToTicketField?: string;
}

// ============================================
// Form Types
// ============================================

export interface CustomFormDefinition {
  id?: number;
  name: string;
  description?: string;
  slug: string;
  status: FormStatus;
  category: Category;
  defaultPriority: Priority;
  defaultAssigneeId?: number;
  fields: FormFieldDefinition[];
  successMessage?: string;
  submitButtonText?: string;
  enableCaptcha?: boolean;
  allowAnonymous?: boolean;
  isTemplate?: boolean;
  templateCategory?: string;
  clonedFromId?: number;
  createdById?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FormCreateRequest {
  name: string;
  description?: string;
  category: Category;
  defaultPriority?: Priority;
  defaultAssigneeId?: number;
  fields: FormFieldDefinition[];
  successMessage?: string;
  submitButtonText?: string;
  enableCaptcha?: boolean;
  allowAnonymous?: boolean;
}

export interface FormUpdateRequest {
  name?: string;
  description?: string;
  status?: FormStatus;
  category?: Category;
  defaultPriority?: Priority;
  defaultAssigneeId?: number;
  fields?: FormFieldDefinition[];
  successMessage?: string;
  submitButtonText?: string;
  enableCaptcha?: boolean;
  allowAnonymous?: boolean;
}

// ============================================
// Form Submission Types
// ============================================

export interface FormSubmissionData {
  [fieldName: string]: string | number | boolean | string[] | File[] | null;
}

export interface FormSubmissionAttachmentInfo {
  fieldName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface FormSubmissionRequest {
  formSlug: string;
  data: FormSubmissionData;
  attachments?: FormSubmissionAttachmentInfo[];
  submitterName?: string;
  submitterEmail?: string;
  submitterPhone?: string;
}

export interface FormSubmissionResponse {
  id: number;
  formId: number;
  status: FormSubmissionStatus;
  ticketId?: number;
  message: string;
  redirectUrl?: string;
}

export interface FormSubmissionRecord {
  id: number;
  formId: number;
  formName: string;
  data: FormSubmissionData;
  status: FormSubmissionStatus;
  ticketId?: number;
  submitterId?: number;
  submitterName?: string;
  submitterEmail?: string;
  ipAddress?: string;
  createdAt: Date;
  convertedAt?: Date;
}

// ============================================
// Form Analytics Types
// ============================================

export interface DailyFormStats {
  date: string;
  views: number;
  submissions: number;
  conversions: number;
  abandonmentRate: number;
}

export interface FormAnalyticsData {
  formId: number;
  viewCount: number;
  submissionCount: number;
  conversionCount: number;
  conversionRate: number;
  abandonmentRate: number;
  avgCompletionTimeSecs: number;
  lastSubmittedAt?: Date;
  dailyStats: DailyFormStats[];
}

// ============================================
// Form Template Types
// ============================================

export interface FormTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  previewImage?: string;
  formData: Partial<CustomFormDefinition>;
}

// ============================================
// Field Type Metadata
// ============================================

export interface FieldTypeMetadata {
  type: FormFieldType;
  label: string;
  description: string;
  icon: string;
  supportsOptions: boolean;
  supportsValidation: boolean;
  defaultConfig: FormFieldConfig;
}

// Available field types with metadata
export const AVAILABLE_FIELD_TYPES: FieldTypeMetadata[] = [
  {
    type: FormFieldType.TEXT,
    label: 'Single Line Text',
    description: 'A simple text input for short answers',
    icon: 'text',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { placeholder: 'Enter text...' },
  },
  {
    type: FormFieldType.TEXTAREA,
    label: 'Multi Line Text',
    description: 'A larger text area for detailed responses',
    icon: 'align-left',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { placeholder: 'Enter details...', rows: 4 },
  },
  {
    type: FormFieldType.NUMBER,
    label: 'Number',
    description: 'Numeric input with optional min/max values',
    icon: 'hash',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: {},
  },
  {
    type: FormFieldType.EMAIL,
    label: 'Email',
    description: 'Email address input with validation',
    icon: 'mail',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { placeholder: 'email@example.com' },
  },
  {
    type: FormFieldType.PHONE,
    label: 'Phone Number',
    description: 'Phone number input with formatting',
    icon: 'phone',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { placeholder: '+1 (555) 123-4567' },
  },
  {
    type: FormFieldType.DATE,
    label: 'Date',
    description: 'Date picker',
    icon: 'calendar',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { dateFormat: 'YYYY-MM-DD' },
  },
  {
    type: FormFieldType.DATETIME,
    label: 'Date & Time',
    description: 'Date and time picker',
    icon: 'clock',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { showTime: true, dateFormat: 'YYYY-MM-DD HH:mm' },
  },
  {
    type: FormFieldType.SELECT,
    label: 'Dropdown',
    description: 'Single selection from a dropdown list',
    icon: 'chevron-down',
    supportsOptions: true,
    supportsValidation: true,
    defaultConfig: {},
  },
  {
    type: FormFieldType.MULTISELECT,
    label: 'Multi Select',
    description: 'Multiple selection from a list',
    icon: 'list',
    supportsOptions: true,
    supportsValidation: true,
    defaultConfig: {},
  },
  {
    type: FormFieldType.CHECKBOX,
    label: 'Checkbox',
    description: 'Single or multiple checkboxes',
    icon: 'check-square',
    supportsOptions: true,
    supportsValidation: true,
    defaultConfig: {},
  },
  {
    type: FormFieldType.RADIO,
    label: 'Radio Buttons',
    description: 'Single selection from radio options',
    icon: 'circle',
    supportsOptions: true,
    supportsValidation: true,
    defaultConfig: {},
  },
  {
    type: FormFieldType.FILE,
    label: 'File Upload',
    description: 'Allow users to upload files',
    icon: 'upload',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { multiple: false, maxFiles: 5, maxFileSize: 10485760 }, // 10MB
  },
  {
    type: FormFieldType.URL,
    label: 'URL',
    description: 'Website URL input with validation',
    icon: 'link',
    supportsOptions: false,
    supportsValidation: true,
    defaultConfig: { placeholder: 'https://example.com' },
  },
  {
    type: FormFieldType.RATING,
    label: 'Rating',
    description: 'Star rating input',
    icon: 'star',
    supportsOptions: false,
    supportsValidation: false,
    defaultConfig: { min: 1, max: 5 },
  },
  {
    type: FormFieldType.SLIDER,
    label: 'Slider',
    description: 'Range slider for numeric values',
    icon: 'sliders',
    supportsOptions: false,
    supportsValidation: false,
    defaultConfig: { min: 0, max: 100, step: 1 },
  },
];

// ============================================
// Form Builder Events
// ============================================

export enum FormBuilderEventType {
  FORM_CREATED = 'form.created',
  FORM_UPDATED = 'form.updated',
  FORM_PUBLISHED = 'form.published',
  FORM_ARCHIVED = 'form.archived',
  FORM_SUBMITTED = 'form.submitted',
  FORM_CONVERTED = 'form.converted',
}

export interface FormCreatedEventData {
  formId: number;
  formName: string;
  category: Category;
  createdBy: number;
}

export interface FormSubmittedEventData {
  submissionId: number;
  formId: number;
  formName: string;
  category: Category;
  submitterId?: number;
  submitterEmail?: string;
}

export interface FormConvertedEventData {
  submissionId: number;
  ticketId: number;
  ticketNumber: string;
  formId: number;
  formName: string;
  convertedBy: number;
}
