export enum Role {
  Engineer = 'Engineer',
  Manager = 'Manager',
  Director = 'Director',
  Admin = 'Admin',
  CIO = 'CIO',
  // New Roles for specific workflows
  InfraHead = 'InfraHead',
  CISO = 'CISO',
  HardwareEngineer = 'HardwareEngineer',
  CTOAppOwner = 'CTOAppOwner',
  CTOInfraHead = 'CTOInfraHead',
  CTO = 'CTO',
}

export enum Category {
  GeneralInquiry = 'GeneralInquiry',
  TechnicalSupport = 'TechnicalSupport',
  BillingQuestion = 'BillingQuestion',
  BugReport = 'BugReport',
  FeatureRequest = 'FeatureRequest',
  Hardware = 'Hardware',
  ProductionChange = 'ProductionChange',
}

export enum Status {
  Draft = 'Draft',
  InApproval = 'InApproval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Closed = 'Closed',
}

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export interface NotificationPreferences {
  onStatusChange: boolean;
  onNewComment: boolean;
  onAssignment: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: string | Role;
  preferences: NotificationPreferences;
}

export interface HistoryLog {
  timestamp: Date;
  user: User;
  action: string;
  details?: string;
  comment?: string;
}

export interface Comment {
  id: number;
  user: User;
  timestamp: Date;
  text: string;
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
}

export interface WorkflowStage {
  id: number;
  name: string;
  approverRole: Role;
}

export interface Workflow {
  id: number;
  name: string;
  description: string;
  stages: WorkflowStage[];
}

export interface Ticket {
  id: number;
  ticketId: string;
  title: string;
  description: string;
  requestor: User;
  assignee: User;
  status: Status;
  priority: Priority;
  category: Category;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  history: HistoryLog[];
  comments: Comment[];
  isExpedited?: boolean;
  workflowId: number | null;
  currentStageIndex: number;
  dependencies: number[];
  blocking: number[];
  dueDate?: Date;

  /**
   * List of users who are watching this ticket for updates. Watchers
   * will receive notifications when the ticket status changes, new
   * comments are added, or the ticket is reassigned. This array is
   * initialized as an empty list when a ticket is created and
   * should be updated via the add‑watcher feature.
   */
  watchers: User[];
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- Automation Module Types ---

export interface AssignmentRule {
  id: number;
  name: string;
  category: Category;
  role: Role;
  method: 'ROUND_ROBIN'; // Extendable for other methods like 'LEAST_WORKLOAD'
}

export interface PrioritizationRule {
  id: number;
  name: string;
  keyword: string; // A keyword to search for in title/description
  priority: Priority; // The priority to set if the keyword is found
}

export interface EscalationRule {
  id: number;
  name: string;
  priority: Priority;
  status: Status;
  hours: number; // Time limit in hours
  escalateToRole: Role;
  newPriority?: Priority; // Optional: change priority on escalation
}
