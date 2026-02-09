import { User, Ticket, Role, Status, Priority, Category, Workflow, AssignmentRule, PrioritizationRule, EscalationRule } from './types';

export const SYSTEM_USER: User = {
  id: 0,
  name: 'System Automation',
  email: 'system@example.com',
  role: Role.Admin,
  preferences: { onStatusChange: false, onNewComment: false, onAssignment: false }
};

export const USERS: User[] = [
  SYSTEM_USER,
  { 
    id: 1, 
    name: 'Alice (Engineer)', 
    email: 'alice@example.com',
    password: 'password',
    role: Role.Engineer, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 2, 
    name: 'Bob (Manager)', 
    email: 'bob@example.com',
    password: 'password',
    role: Role.Manager, 
    preferences: { onStatusChange: true, onNewComment: false, onAssignment: true } 
  },
  { 
    id: 3, 
    name: 'Charlie (Director)', 
    email: 'charlie@example.com',
    password: 'password',
    role: Role.Director, 
    preferences: { onStatusChange: true, onNewComment: false, onAssignment: false } 
  },
  { 
    id: 4, 
    name: 'Dave (Engineer)', 
    email: 'dave@example.com',
    password: 'password',
    role: Role.Engineer, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 5, 
    name: 'Eve (Admin)', 
    email: 'eve@example.com',
    password: 'password',
    role: Role.Admin, 
    preferences: { onStatusChange: false, onNewComment: false, onAssignment: false } 
  },
  { 
    id: 6, 
    name: 'Frank (CIO)', 
    email: 'frank@example.com',
    password: 'password',
    role: Role.CIO, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  // New users for the specific workflows
  { 
    id: 7, 
    name: 'Ian (Infra Head)', 
    email: 'ian@example.com',
    password: 'password',
    role: Role.InfraHead, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 8, 
    name: 'Carol (CISO)', 
    email: 'carol@example.com',
    password: 'password',
    role: Role.CISO, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 9, 
    name: 'Hank (Hardware Engineer)', 
    email: 'hank@example.com',
    password: 'password',
    role: Role.HardwareEngineer, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 10, 
    name: 'Annie (CTO App Owner)', 
    email: 'annie@example.com',
    password: 'password',
    role: Role.CTOAppOwner, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 11, 
    name: 'Simon (CTO Infra Head)', 
    email: 'simon@example.com',
    password: 'password',
    role: Role.CTOInfraHead, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
  { 
    id: 12, 
    name: 'Tina (CTO)', 
    email: 'tina@example.com',
    password: 'password',
    role: Role.CTO, 
    preferences: { onStatusChange: true, onNewComment: true, onAssignment: true } 
  },
];

export const DEFAULT_WORKFLOWS: Workflow[] = [
    {
        id: 1,
        name: 'New Hardware Request',
        description: 'Engineer → Infra Head → CIO → CISO → Hardware Engineer',
        stages: [
            { id: 1, name: 'Infra Head Approval', approverRole: Role.InfraHead },
            { id: 2, name: 'CIO Approval', approverRole: Role.CIO },
            { id: 3, name: 'CISO Approval', approverRole: Role.CISO },
        ]
    },
    {
        id: 2,
        name: 'Old Hardware Replacement',
        description: 'Engineer → Infra Head → CIO (Notification only) → Hardware Engineer',
        stages: [
            { id: 1, name: 'Infra Head Approval', approverRole: Role.InfraHead },
        ]
    },
    {
        id: 3,
        name: 'Application/Production Change',
        description: 'Engineer → CTO App Owner → CTO Infra Head → CISO → CTO → CISO (Notification only)',
        stages: [
            { id: 1, name: 'CTO App Owner Approval', approverRole: Role.CTOAppOwner },
            { id: 2, name: 'CTO Infra Head Approval', approverRole: Role.CTOInfraHead },
            { id: 3, name: 'CISO Approval', approverRole: Role.CISO },
            { id: 4, name: 'CTO Approval', approverRole: Role.CTO },
        ]
    }
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 1,
    ticketId: 'TKT-20231101-0001',
    title: 'Request for new blade server for data processing',
    description: 'We require a new high-performance blade server to handle the increased load for our data analytics pipeline. Specifications are attached.',
    requestor: USERS.find(u => u.role === Role.Engineer)!,
    assignee: USERS.find(u => u.role === Role.Engineer)!,
    status: Status.InApproval,
    priority: Priority.High,
    category: Category.Hardware,
    attachments: [{ name: 'server_specs.pdf', size: 256000, type: 'application/pdf' }],
    createdAt: new Date('2023-11-01T10:00:00Z'),
    updatedAt: new Date('2023-11-01T10:00:00Z'),
    history: [
      { timestamp: new Date('2023-11-01T10:00:00Z'), user: USERS.find(u => u.role === Role.Engineer)!, action: 'Submitted', details: 'Submitted to workflow "New Hardware Request".' }
    ],
    comments: [],
    workflowId: 1,
    currentStageIndex: 0, // Pending Infra Head Approval
    dependencies: [],
    blocking: [],
    dueDate: new Date('2023-11-15T23:59:59Z'),
    // Initialize watchers as an empty array. Watchers will be added
    // dynamically when users subscribe to ticket updates.
    watchers: [],
  },
  {
    id: 2,
    ticketId: 'TKT-20231030-0001',
    title: 'Replace failing SAN storage unit in DC-2',
    description: 'The primary SAN in datacenter 2 is reporting multiple predictive failures. It needs to be replaced before a critical failure occurs.',
    requestor: USERS.find(u => u.id === 4)!, // Dave (Engineer)
    assignee: USERS.find(u => u.role === Role.HardwareEngineer)!, // Hank
    status: Status.InProgress,
    priority: Priority.Critical,
    category: Category.Hardware,
    attachments: [],
    createdAt: new Date('2023-10-30T14:30:00Z'),
    updatedAt: new Date('2023-11-01T11:00:00Z'),
    history: [
       { timestamp: new Date('2023-10-30T14:30:00Z'), user: USERS.find(u => u.id === 4)!, action: 'Submitted', details: 'Submitted to workflow "Old Hardware Replacement".' },
       { timestamp: new Date('2023-10-31T16:00:00Z'), user: USERS.find(u => u.role === Role.InfraHead)!, action: 'Approved', details: 'Approved final stage "Infra Head Approval".', comment: 'Approved. Expedite this replacement.' },
       { timestamp: new Date('2023-10-31T16:00:05Z'), user: SYSTEM_USER, action: 'Auto-Assigned', details: 'Ticket automatically assigned to Hank (Hardware Engineer) based on rule: "Assign Hardware to Hardware Engineers".'},
       { timestamp: new Date('2023-11-01T11:00:00Z'), user: USERS.find(u => u.role === Role.HardwareEngineer)!, action: 'Status Change', details: 'Status changed to In Progress.'}
    ],
    comments: [],
    workflowId: 2,
    currentStageIndex: 0, // Last stage completed
    dependencies: [],
    blocking: [],
    dueDate: new Date('2023-11-05T23:59:59Z'),
    // Initialize watchers as an empty array
    watchers: [],
  },
  {
    id: 3,
    ticketId: 'TKT-20231029-0001',
    title: 'Deploy microservice v1.2 to production',
    description: 'Request to deploy the new version of the user-profiles microservice. It includes performance enhancements and bug fixes. All tests passed in staging.',
    requestor: USERS.find(u => u.role === Role.Engineer)!,
    assignee: USERS.find(u => u.role === Role.Engineer)!,
    status: Status.InApproval,
    priority: Priority.High,
    category: Category.ProductionChange,
    attachments: [],
    createdAt: new Date('2023-10-29T09:00:00Z'),
    updatedAt: new Date('2023-10-31T17:00:00Z'),
    history: [
      { timestamp: new Date('2023-10-29T09:00:00Z'), user: USERS.find(u => u.role === Role.Engineer)!, action: 'Submitted', details: 'Submitted to workflow "Application/Production Change".' },
      { timestamp: new Date('2023-10-30T11:00:00Z'), user: USERS.find(u => u.role === Role.CTOAppOwner)!, action: 'Approved', details: 'Approved stage "CTO App Owner Approval".' },
      { timestamp: new Date('2023-10-31T17:00:00Z'), user: USERS.find(u => u.role === Role.CTOInfraHead)!, action: 'Approved', details: 'Approved stage "CTO Infra Head Approval".', comment: 'Infra is ready for deployment.' },
    ],
    comments: [],
    workflowId: 3,
    currentStageIndex: 2, // Pending CISO approval
    dependencies: [],
    blocking: [],
    dueDate: new Date('2023-11-10T23:59:59Z'),
    // Initialize watchers as an empty array
    watchers: [],
  },
];

// --- Automation Rules ---

export const INITIAL_ASSIGNMENT_RULES: AssignmentRule[] = [
    { id: 1, name: 'Assign Hardware to Hardware Engineers', category: Category.Hardware, role: Role.HardwareEngineer, method: 'ROUND_ROBIN' },
    { id: 2, name: 'Assign Production Changes to Engineers', category: Category.ProductionChange, role: Role.Engineer, method: 'ROUND_ROBIN' },
];

export const INITIAL_PRIORITIZATION_RULES: PrioritizationRule[] = [
    { id: 1, name: 'Urgent keyword', keyword: 'urgent', priority: Priority.High },
    { id: 2, name: 'Critical outage keyword', keyword: 'outage', priority: Priority.Critical },
    { id: 3, name: 'Critical down keyword', keyword: 'down', priority: Priority.Critical },
];

export const INITIAL_ESCALATION_RULES: EscalationRule[] = [
    { id: 1, name: 'Critical Tickets Unassigned > 2 hours', priority: Priority.Critical, status: Status.Approved, hours: 2, escalateToRole: Role.Manager },
    { id: 2, name: 'High Tickets Unassigned > 8 hours', priority: Priority.High, status: Status.Approved, hours: 8, escalateToRole: Role.Manager },
    { id: 3, name: 'Critical Tickets In Progress > 24 hours', priority: Priority.Critical, status: Status.InProgress, hours: 24, escalateToRole: Role.Director, newPriority: Priority.Critical },
];
