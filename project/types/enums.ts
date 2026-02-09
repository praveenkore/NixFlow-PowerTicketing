/**
 * Enum definitions matching the backend Prisma schema
 */

// Role enumeration
export enum Role {
  Engineer = 'Engineer',
  Manager = 'Manager',
  Director = 'Director',
  Admin = 'Admin',
  CIO = 'CIO',
  InfraHead = 'InfraHead',
  CISO = 'CISO',
  HardwareEngineer = 'HardwareEngineer',
  CTOAppOwner = 'CTOAppOwner',
  CTOInfraHead = 'CTOInfraHead',
  CTO = 'CTO',
}

// Category enumeration for ticket categories
export enum Category {
  GeneralInquiry = 'GeneralInquiry',
  TechnicalSupport = 'TechnicalSupport',
  BillingQuestion = 'BillingQuestion',
  BugReport = 'BugReport',
  FeatureRequest = 'FeatureRequest',
  Hardware = 'Hardware',
  ProductionChange = 'ProductionChange',
}

// Status enumeration for ticket lifecycle
export enum Status {
  Draft = 'Draft',
  InApproval = 'InApproval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Closed = 'Closed',
}

// Priority enumeration for ticket priority
export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

// Form Field Type enumeration
export enum FormFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  FILE = 'FILE',
  URL = 'URL',
  PASSWORD = 'PASSWORD',
  RATING = 'RATING',
  SLIDER = 'SLIDER',
}

// Form Status enumeration
export enum FormStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}

// Form Submission Status enumeration
export enum FormSubmissionStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Converted = 'Converted',
  Failed = 'Failed',
}

// Knowledge Base Category
export enum KBCategory {
  Hardware = 'Hardware',
  Software = 'Software',
  Network = 'Network',
  Security = 'Security',
  Access = 'Access',
  General = 'General',
  Troubleshooting = 'Troubleshooting',
  FAQ = 'FAQ',
  Procedures = 'Procedures',
  Policies = 'Policies',
}

// Knowledge Article Status
export enum KnowledgeArticleStatus {
  Draft = 'Draft',
  PendingReview = 'PendingReview',
  Published = 'Published',
  Archived = 'Archived',
}
