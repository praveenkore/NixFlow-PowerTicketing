# TicketDetail.tsx - Component Analysis Summary

## Overview

The [`TicketDetail.tsx`](../project/components/TicketDetail.tsx:1) component is a comprehensive React component that displays detailed information about a single ticket, including its metadata, description, workflow status, comments, history, dependencies, and action buttons for various ticket operations.

---

## How the Component Works

### 1. Component Structure

The component is organized into several key sections:

- **Header Section** (lines 166-210): Displays ticket title, status badges, priority badges, and edit button
- **Workflow Visualization** (lines 212-217): Shows the approval workflow progress using [`WorkflowVisualizer`](../project/components/WorkflowVisualizer.tsx:1)
- **Description & Attachments** (lines 219-241): Shows ticket description (sanitized with DOMPurify) and file attachments
- **Ticket Details Sidebar** (lines 243-279): Displays requestor, assignee, category, priority, due date, and last update
- **SLA Information** (lines 282-285): Integrates [`SLATicketDetailComponent`](../project/components/SLATicketDetail.tsx:1) for SLA tracking
- **Dependencies & Blocking** (lines 287-322): Shows related tickets that must be completed or are waiting
- **Comments Section** (lines 324-340): Displays all comments and allows adding new comments
- **History Section** (lines 342-347): Shows timeline of all ticket actions
- **Actions Section** (lines 349-408): Displays action buttons based on user permissions and ticket status
- **Approval Modal** (lines 411-441): Modal dialog for confirming approve/reject actions

### 2. State Management

The component uses several state variables:

| State Variable | Purpose | Initial Value |
|---------------|---------|---------------|
| `actionComment` | Comment for status change actions | `''` |
| `newComment` | New comment text | `''` |
| `isReassigning` | Controls assignee edit mode | `false` |
| `newAssigneeId` | Selected new assignee ID | `ticket.assignee.id` |
| `isApprovalModalOpen` | Controls approval modal visibility | `false` |
| `approvalAction` | Stores 'APPROVE' or 'REJECT' action | `null` |
| `approvalComment` | Comment for approval/rejection | `''` |

### 3. Key Helper Functions

#### `canApproveReject` (line 96)
```typescript
const canApproveReject = ticket.status === Status.InApproval && currentStage?.approverRole === currentUser.role;
```
**Purpose**: Determines if the current user can approve or reject the ticket.

**Conditions**:
- Ticket status must be `Status.InApproval`
- The current stage's `approverRole` must match the `currentUser.role`

#### `canEdit` (line 97)
```typescript
const canEdit = currentUser.id === ticket.requestor.id && (ticket.status === Status.Draft || ticket.status === Status.Rejected);
```
**Purpose**: Determines if the current user can edit the ticket.

**Conditions**:
- Current user must be the ticket requestor
- Ticket status must be `Draft` or `Rejected`

#### `canStartWork` (line 99)
```typescript
const canStartWork = currentUser.id === ticket.assignee.id && ticket.status === Status.Approved && !isBlocked;
```
**Purpose**: Determines if the assignee can start working on the ticket.

**Conditions**:
- Current user must be the assignee
- Ticket status must be `Approved`
- Ticket must not be blocked by unresolved dependencies

#### `canMarkComplete` (line 100)
```typescript
const canMarkComplete = currentUser.id === ticket.assignee.id && ticket.status === Status.InProgress;
```
**Purpose**: Determines if the assignee can mark the ticket as complete.

**Conditions**:
- Current user must be the assignee
- Ticket status must be `InProgress`

#### `canClose` (line 101)
```typescript
const canClose = (currentUser.id === ticket.requestor.id || currentUser.role === Role.Admin) && ticket.status === Status.Completed;
```
**Purpose**: Determines if the ticket can be closed.

**Conditions**:
- Current user must be the requestor OR have Admin role
- Ticket status must be `Completed`

#### `canReassign` (line 114)
```typescript
const canReassign = managementRoles.includes(currentUser.role);
```
**Purpose**: Determines if the current user can reassign the ticket.

**Management Roles** (lines 103-113):
- Manager
- Director
- Admin
- CIO
- InfraHead
- CISO
- CTOAppOwner
- CTOInfraHead
- CTO

### 4. Event Handlers

#### `handleOpenApprovalModal` (lines 116-120)
Opens the approval modal with the specified action ('APPROVE' or 'REJECT').

```typescript
const handleOpenApprovalModal = (action: 'APPROVE' | 'REJECT') => {
  setApprovalAction(action);
  setApprovalComment('');
  setIsApprovalModalOpen(true);
};
```

#### `handleConfirmApproval` (lines 122-127)
Confirms the approval/rejection action and calls the parent component's `onApproveReject` function.

```typescript
const handleConfirmApproval = () => {
  if (!approvalAction) return;
  onApproveReject(ticket.id, approvalAction, approvalComment);
  setIsApprovalModalOpen(false);
  setApprovalAction(null);
};
```

#### `handleStatusChange` (lines 129-132)
Updates the ticket status with an optional comment.

```typescript
const handleStatusChange = (newStatus: Status, defaultComment: string, actionName: string) => {
  onUpdateTicketStatus(ticket.id, newStatus, actionComment || defaultComment, actionName);
  setActionComment('');
};
```

#### `handleReassign` (lines 134-139)
Reassigns the ticket to a new user.

```typescript
const handleReassign = () => {
  if(newAssigneeId !== ticket.assignee.id) {
    onReassignTicket(ticket.id, newAssigneeId);
  }
  setIsReassigning(false);
};
```

#### `handleAddComment` (lines 141-147)
Adds a new comment to the ticket.

```typescript
const handleAddComment = (e: React.FormEvent) => {
  e.preventDefault();
  if (newComment.trim()) {
    onAddComment(ticket.id, newComment.trim());
    setNewComment('');
  }
};
```

---

## Approve and Reject Logic

### 1. Visibility Logic

**Approve and Reject buttons are displayed** when:
- The ticket status is `Status.InApproval`
- The current user's role matches the current workflow stage's `approverRole`

**Implementation** (line 96):
```typescript
const canApproveReject = ticket.status === Status.InApproval && currentStage?.approverRole === currentUser.role;
```

### 2. Button Rendering

The approve and reject buttons are rendered in the Actions section (lines 365-374):

```typescript
{canApproveReject && (
  <>
    <button onClick={() => handleOpenApprovalModal('APPROVE')} className="px-6 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2">
      <CheckCircleIcon className="h-5 w-5"/> Approve
    </button>
    <button onClick={() => handleOpenApprovalModal('REJECT')} className="px-6 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2">
      <XCircleIcon className="h-5 w-5"/> Reject
    </button>
  </>
)}
```

**Key Points**:
- Both buttons are conditionally rendered based on `canApproveReject`
- Buttons are only visible when the condition is true
- Both buttons use the same modal for confirmation

### 3. Approval Modal Flow

When a user clicks Approve or Reject:

1. **Modal Opens** (lines 411-441):
   - A modal dialog appears with a dark backdrop
   - Modal title shows "Approve Ticket" or "Reject Ticket"
   - Textarea allows optional comment input

2. **User Confirmation**:
   - User can enter an optional comment
   - User clicks "Cancel" to close the modal without action
   - User clicks "Confirm Approval" or "Confirm Rejection" to proceed

3. **Action Execution** (lines 122-127):
   - `handleConfirmApproval` is called
   - Parent component's `onApproveReject` function is invoked with:
     - `ticketId`: The ticket's ID
     - `action`: 'APPROVE' or 'REJECT'
     - `comment`: Optional comment from the modal
   - Modal is closed
   - Approval action state is reset

### 4. Backend Integration

The `onApproveReject` prop is passed from the parent component ([`App.tsx`](../project/App.tsx:412-445)), which calls the backend API:

- **Approve**: `POST /api/tickets/:id/approve`
- **Reject**: `POST /api/tickets/:id/reject`

**Backend Logic** ([`backend/src/index.ts`](../backend/src/index.ts:263-306)):
- Find ticket and workflow
- Check if user is authorized (role matches current stage's approver)
- Update ticket status and stage index
- Create history log entry
- Return updated ticket

---

## Are Approve and Reject Buttons Visible?

### Answer: **YES, they are visible on the page** - but **conditionally**.

### Visibility Conditions

The approve and reject buttons are visible **ONLY** when:

1. ✅ Ticket status is `Status.InApproval`
2. ✅ Current user's role matches the current workflow stage's `approverRole`

### When Buttons are NOT Visible

The approve and reject buttons are **NOT** visible when:

| Scenario | Reason |
|----------|--------|
| Ticket status is `Draft`, `Approved`, `InProgress`, `Completed`, `Closed`, or `Rejected` | Not in approval stage |
| Current user's role doesn't match the stage's approver role | User not authorized to approve |
| Ticket has no workflow assigned | No approval stages defined |
| Ticket is already at the final stage | No more approvals needed |

### Visual Indicators

When buttons are visible:
- **Approve Button**: Green background (`bg-green-600`) with checkmark icon
- **Reject Button**: Red background (`bg-red-600`) with X icon
- Both buttons have hover effects and are located in the "Actions" section

When buttons are NOT visible:
- The entire "Actions" section may still show other buttons (Edit & Resubmit, Start Work, Mark as Complete, Close Ticket) depending on the user's permissions and ticket status

### Example Scenarios

#### Scenario 1: Buttons Visible ✅
```
Ticket Status: InApproval
Current Stage: Manager Approval
Current User Role: Manager
→ Buttons VISIBLE
```

#### Scenario 2: Buttons NOT Visible ❌
```
Ticket Status: InApproval
Current Stage: Director Approval
Current User Role: Manager
→ Buttons NOT VISIBLE (wrong role)
```

#### Scenario 3: Buttons NOT Visible ❌
```
Ticket Status: Approved
Current Stage: None (approval complete)
Current User Role: Manager
→ Buttons NOT VISIBLE (not in approval)
```

---

## Key Features Summary

| Feature | Description |
|---------|-------------|
| **XSS Protection** | Uses DOMPurify to sanitize HTML content in ticket descriptions |
| **Role-Based Access** | Different actions available based on user role and ticket status |
| **Workflow Integration** | Displays multi-stage approval workflow with visual progress |
| **Dependency Management** | Shows blocking/dependent tickets with status indicators |
| **Comment System** | Allows adding comments with user and timestamp |
| **History Tracking** | Displays complete audit trail of all ticket actions |
| **SLA Tracking** | Integrates SLA information component for compliance monitoring |
| **Reassignment** | Management roles can reassign tickets to other users |
| **Modal Confirmation** | Approval/rejection actions require modal confirmation |
| **Responsive Design** | Uses Tailwind CSS for mobile-friendly layouts |

---

## Component Props

| Prop | Type | Description |
|------|------|-------------|
| `ticket` | `Ticket` | The ticket object to display |
| `allTickets` | `Ticket[]` | All tickets for dependency lookup |
| `currentUser` | `User` | Currently logged-in user |
| `users` | `User[]` | List of all users for reassignment |
| `workflows` | `Workflow[]` | Available workflows for the ticket |
| `onBack` | `() => void` | Callback to navigate back to ticket list |
| `onUpdateTicketStatus` | Function | Callback to update ticket status |
| `onApproveReject` | Function | Callback for approve/reject actions |
| `onEditTicket` | Function | Callback to edit ticket |
| `onAddComment` | Function | Callback to add comment |
| `onReassignTicket` | Function | Callback to reassign ticket |
| `onViewTicket` | Function | Callback to view another ticket |

---

## Dependencies

- **React**: Core framework (useState, useMemo)
- **DOMPurify**: XSS sanitization for HTML content
- **Badge Component**: Displays status/priority badges
- **WorkflowVisualizer**: Visualizes approval workflow progress
- **SLATicketDetailComponent**: Displays SLA information
- **Icons**: Various icons from `./icons` (ClockIcon, CheckCircleIcon, XCircleIcon, etc.)

---

## Conclusion

The [`TicketDetail.tsx`](../project/components/TicketDetail.tsx:1) component is a well-structured, feature-rich component that provides comprehensive ticket management functionality. The approve and reject buttons are **visible on the page** but only appear when the user has the appropriate role and the ticket is in the approval stage. This ensures proper authorization and prevents unauthorized approval actions.

The component follows React best practices with proper state management, event handling, and conditional rendering based on user permissions and ticket status.
