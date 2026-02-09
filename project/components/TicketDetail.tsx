import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Ticket, User, Role, Status, Comment, Category, Workflow } from '../types';
import { Badge } from './Badge';
import { ClockIcon, CheckCircleIcon, XCircleIcon, ArrowUturnLeftIcon, PencilSquareIcon, TagIcon, User as UserIcon, DocumentDuplicateIcon, LinkIcon, LockClosedIcon } from './icons';
import { WorkflowVisualizer } from './WorkflowVisualizer';
import { SLATicketDetailComponent } from './SLATicketDetail';

/**
 * Safely formats a date value that may be a Date object, string, or null/undefined.
 * Handles API responses where dates are serialized as ISO strings.
 *
 * @param dateValue - The date value to format (Date, string, or null/undefined)
 * @param formatFn - The format function to use (default: toLocaleDateString)
 * @returns Formatted date string or fallback text
 */
const formatDate = (
  dateValue: Date | string | null | undefined,
  formatFn: (date: Date) => string = (date) => date.toLocaleDateString()
): string => {
  if (!dateValue) {
    return 'N/A';
  }
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return formatFn(date);
  } catch (error) {
    console.error('Error formatting date:', error, 'Value:', dateValue);
    return 'Invalid Date';
  }
};

interface TicketDetailProps {
  ticket: Ticket;
  allTickets: Ticket[];
  currentUser: User;
  users: User[];
  workflows: Workflow[];
  onBack: () => void;
  onUpdateTicketStatus: (ticketId: number, newStatus: Status, comment?: string, action?: string) => void;
  onApproveReject: (ticketId: number, action: 'APPROVE' | 'REJECT', comment?: string) => void;
  onEditTicket: (ticket: Ticket) => void;
  onAddComment: (ticketId: number, commentText: string) => void;
  onReassignTicket: (ticketId: number, newAssigneeId: number) => void;
  onViewTicket: (ticketId: number) => void;
}

const HistoryItem: React.FC<{ log: Ticket['history'][0] }> = ({ log }) => {
    const getIcon = () => {
        switch(log.action) {
            case 'Submitted':
            case 'Resubmitted':
                 return <ClockIcon className="h-5 w-5 text-yellow-500" />;
            case 'Approved':
                return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'Rejected':
                return <XCircleIcon className="h-5 w-5 text-red-500" />;
            default:
                return <PencilSquareIcon className="h-5 w-5 text-gray-500" />;
        }
    }
    return (
        <li className="mb-6 ms-6">            
            <span className="absolute flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full -start-4 ring-4 ring-white dark:ring-gray-800 dark:bg-gray-700">
                {getIcon()}
            </span>
            <div className="ml-2">
                <h3 className="flex items-center mb-1 text-md font-semibold text-gray-900 dark:text-white">
                    {log.action} by {log.user.name}
                </h3>
                <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                    {formatDate(log.timestamp, (date) => date.toLocaleString())}
                </time>
                {log.details && <p className="text-sm text-gray-500 dark:text-gray-400">{log.details}</p>}
                {log.comment && <p className="p-3 text-sm italic border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mt-2">"{log.comment}"</p>}
            </div>
        </li>
    )
}

const CommentItem: React.FC<{comment: Comment}> = ({comment}) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
            <UserIcon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="flex-1">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{comment.user.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.timestamp, (date) => date.toLocaleString())}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.text}</p>
            </div>
        </div>
    </div>
)

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, allTickets, currentUser, users, workflows, onBack, onUpdateTicketStatus, onApproveReject, onEditTicket, onAddComment, onReassignTicket, onViewTicket }) => {
  const [actionComment, setActionComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState<number>(ticket.assignee.id);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  const ticketWorkflow = ticket.workflowId ? workflows.find(w => w.id === ticket.workflowId) : null;
  const currentStage = ticketWorkflow ? ticketWorkflow.stages[ticket.currentStageIndex] : null;

  const unresolvedDependencies = useMemo(() => (ticket.dependencies || []).map(depId => {
        const depTicket = allTickets.find(t => t.id === depId);
        return (depTicket && depTicket.status !== Status.Completed && depTicket.status !== Status.Closed) ? depTicket : null;
    }).filter(Boolean) as Ticket[], [ticket.dependencies, allTickets]);

  const isBlocked = unresolvedDependencies.length > 0;
  const isOverdue = ticket.dueDate && new Date() > ticket.dueDate && ticket.status !== Status.Completed && ticket.status !== Status.Closed;

  // Debug logging to verify enum fixes
  console.log('=== TicketDetail Debug Info ===');
  console.log('Ticket ID:', ticket.id);
  console.log('Ticket Status:', ticket.status);
  console.log('Status.InApproval enum value:', Status.InApproval);
  console.log('Status comparison (ticket.status === Status.InApproval):', ticket.status === Status.InApproval);
  console.log('Current User:', currentUser.name);
  console.log('Current User Role:', currentUser.role);
  console.log('Current User Role (type):', typeof currentUser.role);
  console.log('Current Stage:', currentStage?.name);
  console.log('Current Stage Approver Role:', currentStage?.approverRole);
  console.log('Approver Role (type):', typeof currentStage?.approverRole);
  console.log('Role comparison (currentUser.role === currentStage?.approverRole):', currentUser.role === currentStage?.approverRole);
  console.log('Can Approve/Reject:', ticket.status === Status.InApproval && currentStage?.approverRole === currentUser.role);
  console.log('==============================');

  const canApproveReject = ticket.status === Status.InApproval && currentStage?.approverRole === currentUser.role;
  const canEdit = currentUser.id === ticket.requestor.id && (ticket.status === Status.Draft || ticket.status === Status.Rejected);
  const canEditTicket = currentUser.id === ticket.requestor.id || currentUser.role === Role.Admin;
  const canStartWork = currentUser.id === ticket.assignee.id && ticket.status === Status.Approved && !isBlocked;
  const canMarkComplete = currentUser.id === ticket.assignee.id && ticket.status === Status.InProgress;
  const canClose = (currentUser.id === ticket.requestor.id || currentUser.role === Role.Admin) && ticket.status === Status.Completed;
  
  const managementRoles: Role[] = [
    Role.Manager,
    Role.Director,
    Role.Admin,
    Role.CIO,
    Role.InfraHead,
    Role.CISO,
    Role.CTOAppOwner,
    Role.CTOInfraHead,
    Role.CTO,
  ];
  const canReassign = managementRoles.includes(currentUser.role);

  const handleOpenApprovalModal = (action: 'APPROVE' | 'REJECT') => {
    setApprovalAction(action);
    setApprovalComment('');
    setIsApprovalModalOpen(true);
  };

  const handleConfirmApproval = () => {
    if (!approvalAction) return;
    onApproveReject(ticket.id, approvalAction, approvalComment);
    setIsApprovalModalOpen(false);
    setApprovalAction(null);
  };

  const handleStatusChange = (newStatus: Status, defaultComment: string, actionName: string) => {
    onUpdateTicketStatus(ticket.id, newStatus, actionComment || defaultComment, actionName);
    setActionComment('');
  };
  
  const handleReassign = () => {
    if(newAssigneeId !== ticket.assignee.id) {
        onReassignTicket(ticket.id, newAssigneeId);
    }
    setIsReassigning(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
        onAddComment(ticket.id, newComment.trim());
        setNewComment('');
    }
  };

  const getDisplayStatus = (ticket: Ticket): string => {
      if (ticket.status === Status.InApproval && ticketWorkflow) {
          const stage = ticketWorkflow.stages[ticket.currentStageIndex];
          if(stage) return `Pending: ${stage.name}`;
      }
      return ticket.status;
  };

  const getTicketReference = (ticketId: number): string => {
      const foundTicket = allTickets.find(t => t.id === ticketId);
      if (!foundTicket) return `Ticket #${ticketId}`;
      return `${foundTicket.ticketId || `Draft #${foundTicket.id}`}: ${foundTicket.title}`;
  }


  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg relative">
      <button onClick={onBack} className="absolute top-4 left-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
        <ArrowUturnLeftIcon className="h-5 w-5" /> Back to list
      </button>

      <div className="mt-10">
        {ticket.isExpedited && (
            <div className="bg-pink-100 dark:bg-pink-900/50 border-l-4 border-pink-500 text-pink-700 dark:text-pink-200 p-4 rounded-md mb-6" role="alert">
                <p className="font-bold">Expedited Ticket</p>
                <p>This ticket, created by a CIO, is being fast-tracked through the approval process.</p>
            </div>
        )}
        {isBlocked && ticket.status === Status.Approved && (
            <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4 rounded-md mb-6" role="alert">
                <div className="flex items-center gap-2">
                    <LockClosedIcon className="h-6 w-6"/>
                    <div>
                        <p className="font-bold">Ticket Blocked</p>
                        <p>Work cannot begin until all dependencies are completed. See the dependency list below.</p>
                    </div>
                </div>
            </div>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{ticket.title}</h1>
                    {canEditTicket && (
                        <button 
                            onClick={() => onEditTicket(ticket)} 
                            title="Edit Ticket" 
                            className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PencilSquareIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ticket {ticket.ticketId || `(Draft #${ticket.id})`} opened by {ticket.requestor.name} on {formatDate(ticket.createdAt)}
                </p>
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0 flex-shrink-0">
                <Badge type={ticket.priority} />
                <Badge type={ticket.status}>{getDisplayStatus(ticket)}</Badge>
            </div>
        </div>

        {ticketWorkflow && (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Approval Workflow: {ticketWorkflow.name}</h2>
            <WorkflowVisualizer workflow={ticketWorkflow} currentStageIndex={ticket.currentStageIndex} status={ticket.status} />
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Description</h2>
                <div
                    className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.description) }}
                />
            </div>
             {(ticket.attachments || []).length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Attachments</h2>
                    <ul className="space-y-2">
                        {(ticket.attachments || []).map((file, index) => (
                            <li key={index} className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                               <DocumentDuplicateIcon className="h-5 w-5 mr-2 text-gray-500"/>
                                <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline">{file.name}</a>
                                <span className="text-gray-500 dark:text-gray-400 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Details</h2>
            <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-gray-400"/><span className="font-semibold">Requestor:</span> {ticket.requestor.name}</li>
                <li className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gray-400"/>
                    <span className="font-semibold">Assignee:</span> 
                    {!isReassigning && (
                        <>
                            {ticket.assignee.name}
                            {canReassign && <PencilSquareIcon onClick={() => setIsReassigning(true)} className="w-4 h-4 ml-2 text-gray-500 hover:text-blue-600 cursor-pointer"/>}
                        </>
                    )}
                     {isReassigning && (
                        <div className="flex items-center gap-1">
                            <select value={newAssigneeId} onChange={e => setNewAssigneeId(Number(e.target.value))} className="text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700">
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <button onClick={handleReassign} className="p-1 bg-green-500 text-white rounded"><CheckCircleIcon className="w-4 h-4"/></button>
                            <button onClick={() => setIsReassigning(false)} className="p-1 bg-red-500 text-white rounded"><XCircleIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </li>
                <li className="flex items-center gap-2"><TagIcon className="w-5 h-5 text-gray-400"/><span className="font-semibold">Category:</span> {ticket.category}</li>
                <li className="flex items-center gap-2"><TagIcon className="w-5 h-5 text-gray-400"/><span className="font-semibold">Priority:</span> {ticket.priority}</li>
                <li className="flex items-center gap-2"><ClockIcon className="w-5 h-5 text-gray-400"/><span className="font-semibold">Last Update:</span> {formatDate(ticket.updatedAt, (date) => date.toLocaleString())}</li>
                {ticket.dueDate && (
                    <li className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-gray-400"/>
                        <span className="font-semibold">Due Date:</span> 
                        <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                            {formatDate(ticket.dueDate)}
                        </span>
                    </li>
                )}
            </ul>
          </div>
        </div>

        {/* SLA Information Section */}
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <SLATicketDetailComponent ticketId={ticket.id} />
        </div>

        {((ticket.dependencies || []).length > 0 || (ticket.blocking || []).length > 0) && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-8">
                {(ticket.dependencies || []).length > 0 && (
                     <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Dependencies</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">This ticket cannot start until the following tickets are completed:</p>
                        <ul className="space-y-2">
                            {(ticket.dependencies || []).map(id => {
                                const dep = allTickets.find(t => t.id === id);
                                const isDepComplete = dep && (dep.status === Status.Completed || dep.status === Status.Closed);
                                return (
                                    <li key={id} onClick={() => onViewTicket(id)} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                        {isDepComplete ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ClockIcon className="h-4 w-4 text-yellow-500" />}
                                        <span>{getTicketReference(id)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                 {(ticket.blocking || []).length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><LockClosedIcon className="h-5 w-5" /> Blocking</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">The following tickets are waiting for this one to be completed:</p>
                         <ul className="space-y-2">
                            {(ticket.blocking || []).map(id => (
                                <li key={id} onClick={() => onViewTicket(id)} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                    <LinkIcon className="h-4 w-4" />
                                    <span>{getTicketReference(id)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )}
        
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Comments</h2>
            <div className="space-y-4 mb-6">
                {(ticket.comments || []).map(comment => <CommentItem key={comment.id} comment={comment}/>)}
            </div>
            <form onSubmit={handleAddComment} className="flex items-start space-x-4">
                <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                />
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Comment</button>
            </form>
        </div>
        
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">Ticket History</h2>
            <ol className="relative border-s border-gray-200 dark:border-gray-700">
                {(ticket.history || []).map((log, index) => <HistoryItem key={index} log={log} />)}
            </ol>
        </div>
        
        {(canApproveReject || canEdit || canStartWork || canMarkComplete || canClose || isBlocked) && (
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Actions</h2>
                {(!isBlocked && (canStartWork || canMarkComplete || canClose)) && (
                    <div className="mb-4">
                        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add Comment (Optional)</label>
                        <textarea
                            id="comment"
                            rows={3}
                            value={actionComment}
                            onChange={(e) => setActionComment(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                )}
                <div className="flex flex-wrap gap-4">
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
                    {canEdit && (
                         <button onClick={() => onEditTicket(ticket)} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2">
                           <PencilSquareIcon className="h-5 w-5"/> Edit & Resubmit
                        </button>
                    )}
                    {currentUser.id === ticket.assignee.id && ticket.status === Status.Approved && (
                         <div className="relative group">
                            <button 
                                onClick={() => handleStatusChange(Status.InProgress, 'Work has started on this ticket.', 'Start Work')} 
                                className="px-6 py-2 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                disabled={isBlocked}
                            >
                                Start Work
                            </button>
                            {isBlocked && (
                                <div className="absolute bottom-full mb-2 w-64 p-2 text-xs text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    This action is disabled because the ticket is blocked by {unresolvedDependencies.map(t => t.ticketId || `#${t.id}`).join(', ')}.
                                </div>
                            )}
                        </div>
                    )}
                    {canMarkComplete && (
                        <button onClick={() => handleStatusChange(Status.Completed, 'Task completed.', 'Mark as Complete')} className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5" /> Mark as Complete
                        </button>
                    )}
                    {canClose && (
                         <button onClick={() => handleStatusChange(Status.Closed, 'Ticket closed.', 'Close Ticket')} className="px-6 py-2 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 flex items-center gap-2">
                            Close Ticket
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>

      {isApprovalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{approvalAction === 'APPROVE' ? 'Approve Ticket' : 'Reject Ticket'}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Please provide an optional comment for this action.
                    </p>
                    <textarea
                        rows={4}
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>
                <div className="flex justify-end gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
                    <button type="button" onClick={() => setIsApprovalModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmApproval}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md ${approvalAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {approvalAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};