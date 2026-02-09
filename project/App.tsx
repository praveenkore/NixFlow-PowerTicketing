import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Ticket, User, Role, Status, Priority, Category, HistoryLog, Comment, Workflow, Notification, Attachment, AssignmentRule, PrioritizationRule, EscalationRule } from './types';
import { SLAPolicy, SLABreach, type SLANotification as SLANotificationType } from './types/sla';
import { SLANotificationComponent } from './components/SLANotification';
import { USERS, INITIAL_TICKETS, DEFAULT_WORKFLOWS, INITIAL_ASSIGNMENT_RULES, INITIAL_PRIORITIZATION_RULES, INITIAL_ESCALATION_RULES } from './constants';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TicketList, FilterState } from './components/TicketList';
import { TicketDetail } from './components/TicketDetail';
import { TicketForm } from './components/TicketForm';
import { UserProfile } from './components/UserProfile';
import { AdminPanel } from './components/AdminPanel';
import { NotificationToast } from './components/NotificationToast';
import { SLAPolicyList } from './components/SLAPolicyList';
import { SLAPolicyForm } from './components/SLAPolicyForm';
import { SLAPolicyDetail } from './components/SLAPolicyDetail';
import { SLAMetricList } from './components/SLAMetricList';
import { SLABreachList } from './components/SLABreachList';
import { SLABreachAcknowledgment } from './components/SLABreachAcknowledgment';
import { SLAComplianceReport } from './components/SLAComplianceReport';
import { SLADashboard } from './components/SLADashboard';
import { SLATicketDetailComponent } from './components/SLATicketDetail';
import { SLAService } from './services/sla.service';
import eventService, {
    TicketEventType,
    AutomationEventType,
    TicketCreatedEventData,
    TicketStatusChangedEventData,
    TicketApprovedEventData,
    TicketRejectedEventData,
    PrioritizationAppliedEventData,
    AssignmentAppliedEventData,
} from './services/event.service';

type View = 'DASHBOARD' | 'TICKET_LIST' | 'TICKET_DETAIL' | 'PROFILE' | 'ADMIN' | 'SLA_POLICIES' | 'SLA_POLICY_FORM' | 'SLA_POLICY_DETAIL' | 'SLA_METRICS' | 'SLA_BREACHES' | 'SLA_COMPLIANCE_REPORT' | 'SLA_DASHBOARD';

// API base URL - should be in environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to make authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    return fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
};

// Helper function to parse dates in ticket data
const parseTicketDates = (ticket: any): Ticket => ({
    ...ticket,
    createdAt: new Date(ticket.createdAt),
    updatedAt: new Date(ticket.updatedAt),
    history: (ticket.history || []).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
    })),
    comments: (ticket.comments || []).map((comment: any) => ({
        ...comment,
        timestamp: new Date(comment.timestamp)
    })),
    // Ensure requestor and assignee are preserved
    requestor: ticket.requestor || { id: 0, name: 'Unknown', email: '', role: Role.Engineer, preferences: { onStatusChange: false, onNewComment: false, onAssignment: false } },
    assignee: ticket.assignee || { id: 0, name: 'Unknown', email: '', role: Role.Engineer, preferences: { onStatusChange: false, onNewComment: false, onAssignment: false } },
    // Ensure watchers is an array
    watchers: ticket.watchers || [],
    // Ensure other array properties are arrays
    dependencies: ticket.dependencies || [],
    blocking: ticket.blocking || [],
    attachments: ticket.attachments || [],
});

const App: React.FC = () => {
    // State management
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [view, setView] = useState<View>('DASHBOARD');
    const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
    const [users, setUsers] = useState<User[]>(USERS);
    const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
    // Rules state for AdminPanel display (automation is handled by backend EDA)
    const [assignmentRules, setAssignmentRules] = useState(INITIAL_ASSIGNMENT_RULES);
    const [prioritizationRules, setPrioritizationRules] = useState(INITIAL_PRIORITIZATION_RULES);
    const [escalationRules, setEscalationRules] = useState(INITIAL_ESCALATION_RULES);

    // Pagination state for server-side pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Verify session on mount
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('currentUser');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setAuthToken(token);
                setCurrentUser(user);
                eventService.connect();
                console.log('Session restored for user:', user.name);
            } catch (e) {
                console.error('Failed to restore session:', e);
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
            }
        }
    }, []);

    // Fetch tickets and workflows from backend with server-side pagination
    const fetchTickets = useCallback(async () => {
        try {
            const response = await apiCall(`/api/tickets?page=${currentPage}&pageSize=${pageSize}`);
            if (response.ok) {
                const data = await response.json();
                setTickets(data.tickets.map(parseTicketDates));
                setTotalCount(data.pagination.totalCount);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            // Fallback to mock data if backend is unavailable
            setTickets(prev => prev.length === 0 ? INITIAL_TICKETS : prev);
            // Notify user about backend connection issue
            addNotification('Unable to connect to backend. Using local data.', 'warning');
        }
    }, [currentPage, pageSize]);

    const fetchWorkflows = useCallback(async () => {
        try {
            const response = await apiCall('/api/workflows');
            if (response.ok) {
                const data = await response.json();
                setWorkflows(data);
            }
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        }
    }, []);

    useEffect(() => {
        fetchTickets();
        fetchWorkflows();
    }, [fetchTickets, fetchWorkflows]);

    // Setup real-time event listeners (only after login when socket is connected)
    useEffect(() => {
        // Only setup listeners if user is logged in and event service is connected
        if (!currentUser || !eventService.isConnected()) {
            return;
        }

        // Listen for ticket created events
        eventService.onTicketCreated((data: TicketCreatedEventData) => {
            addNotification(`New ticket ${data.ticketNumber} created`, 'success');
            // Refresh tickets to show new ticket
            fetchTickets();
        });

        // Listen for ticket status changed events
        eventService.onTicketStatusChanged((data: TicketStatusChangedEventData) => {
            addNotification(`Ticket ${data.ticketNumber} status changed from ${data.oldStatus} to ${data.newStatus}`, 'info');
            // Refresh tickets to show updated status
            fetchTickets();
        });

        // Listen for ticket approved events
        eventService.onTicketApproved((data: TicketApprovedEventData) => {
            addNotification(`Ticket ${data.ticketNumber} approved`, 'success');
            // Refresh tickets to show updated ticket
            fetchTickets();
        });

        // Listen for ticket rejected events
        eventService.onTicketRejected((data: TicketRejectedEventData) => {
            addNotification(`Ticket ${data.ticketNumber} rejected`, 'warning');
            // Refresh tickets to show updated ticket
            fetchTickets();
        });

        // Listen for prioritization applied events
        eventService.onPrioritizationApplied((data: PrioritizationAppliedEventData) => {
            addNotification(`Ticket ${data.ticketNumber} priority changed from ${data.oldPriority} to ${data.newPriority}`, 'info');
            // Refresh tickets to show updated priority
            fetchTickets();
        });

        // Listen for assignment applied events
        eventService.onAssignmentApplied((data: AssignmentAppliedEventData) => {
            addNotification(`Ticket ${data.ticketNumber} assigned to new user`, 'info');
            // Refresh tickets to show updated assignment
            fetchTickets();
        });

        // Cleanup event listeners on unmount or when user logs out
        return () => {
            eventService.off('ticket.created');
            eventService.off('ticket.status_changed');
            eventService.off('ticket.approved');
            eventService.off('ticket.rejected');
            eventService.off('automation.prioritization_applied');
            eventService.off('automation.assignment_applied');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // SLA-related state
    const [showSLAPolicies, setShowSLAPolicies] = useState(false);
    const [showSLAMetrics, setShowSLAMetrics] = useState(false);
    const [showSLABreaches, setShowSLABreaches] = useState(false);
    const [showSLAReport, setShowSLAReport] = useState(false);
    const [showSLADashboard, setShowSLADashboard] = useState(false);
    const [selectedSLAPolicyId, setSelectedSLAPolicyId] = useState<number | null>(null);
    const [editingSLAPolicy, setEditingSLAPolicy] = useState<SLAPolicy | null>(null);
    const [selectedSLABreach, setSelectedSLABreach] = useState<SLABreach | null>(null);
    const [slaNotifications, setSlaNotifications] = useState<SLANotificationType[]>([]);
    const [isSLABreachAcknowledgmentOpen, setIsSLABreachAcknowledgmentOpen] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        keyword: '',
        status: 'ALL',
        priority: 'ALL',
        category: 'ALL',
        requestorId: 'ALL',
        assigneeId: 'ALL',
        startDate: '',
        endDate: '',
        isExpedited: undefined,
    });

    // --- Memoized Selectors ---
    const selectedTicket = useMemo(() => {
        return tickets.find(t => t.id === selectedTicketId) || null;
    }, [selectedTicketId, tickets]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const { keyword, status, priority, category, requestorId, assigneeId, startDate, endDate } = filters;
            if (keyword) {
                const search = keyword.toLowerCase();
                if (!ticket.title.toLowerCase().includes(search) && !(ticket.ticketId || '').toLowerCase().includes(search) && !ticket.description.toLowerCase().includes(search)) {
                    return false;
                }
            }
            if (status !== 'ALL' && ticket.status !== status) return false;
            if (priority !== 'ALL' && ticket.priority !== priority) return false;
            if (category !== 'ALL' && ticket.category !== category) return false;
            if (requestorId !== 'ALL' && ticket.requestor.id !== requestorId) return false;
            if (assigneeId !== 'ALL' && ticket.assignee.id !== assigneeId) return false;
            if (startDate && new Date(ticket.createdAt) < new Date(startDate)) return false;
            if (endDate && new Date(ticket.createdAt) > new Date(endDate)) return false;
            return true;
        });
    }, [tickets, filters]);

    // --- Utility Functions ---
    const addNotification = useCallback((message: string, type: Notification['type']) => {
        const newNotification: Notification = { id: Date.now(), message, type };
        setNotifications(prev => [...prev, newNotification]);
    }, []);

    const addHistoryLog = (ticket: Ticket, user: User, action: string, details?: string, comment?: string): Ticket => {
        const newLog: HistoryLog = { timestamp: new Date(), user, action, details, comment };
        return { ...ticket, history: [...ticket.history, newLog], updatedAt: new Date() };
    };

    // Note: Automation and escalation are now handled by the backend event-driven architecture
    // The frontend receives real-time updates via the event service

    // --- Event Handlers ---
    const handleLogin = (user: User, token: string) => {
        setCurrentUser(user);
        setAuthToken(token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setView('DASHBOARD');
        addNotification(`Welcome back, ${user.name}!`, 'success');
        // Connect to event service for real-time updates
        eventService.connect();
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setAuthToken(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        // Disconnect from event service
        eventService.disconnect();
    };

    const dismissNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNavigate = (newView: View) => {
        if (newView !== 'TICKET_DETAIL') {
            setSelectedTicketId(null);
        }
        setView(newView);
    };

    const handleViewTicket = (ticket: Ticket | number) => {
        const ticketId = typeof ticket === 'number' ? ticket : ticket.id;
        setSelectedTicketId(ticketId);
        setView('TICKET_DETAIL');
    };

    const handleBack = () => {
        setSelectedTicketId(null);
        setView(view === 'TICKET_DETAIL' ? 'TICKET_LIST' : 'DASHBOARD');
    };

    const handleNewTicket = () => {
        setEditingTicket(null);
        setIsFormOpen(true);
    };

    const handleEditTicket = (ticket: Ticket) => {
        setEditingTicket(ticket);
        setIsFormOpen(true);
    };

    const handleSearch = (keyword: string) => {
        // Reset other filters when searching to provide clean search results
        setFilters({
            keyword,
            status: 'ALL',
            priority: 'ALL',
            category: 'ALL',
            requestorId: 'ALL',
            assigneeId: 'ALL',
            startDate: '',
            endDate: '',
            isExpedited: undefined,
        });
        setView('TICKET_LIST');
    };

    // --- SLA Handlers ---
    const handleViewSLAPolicies = () => {
        setView('SLA_POLICIES');
    };

    const handleViewSLAMetrics = () => {
        setView('SLA_METRICS');
    };

    const handleViewSLABreaches = () => {
        setView('SLA_BREACHES');
    };

    const handleViewSLAReport = () => {
        setView('SLA_COMPLIANCE_REPORT');
    };

    const handleViewSLADashboard = () => {
        setView('SLA_DASHBOARD');
    };

    const handleViewSLAPolicy = (policy: SLAPolicy) => {
        setSelectedSLAPolicyId(policy.id);
        setView('SLA_POLICY_DETAIL');
    };

    const handleCreateSLAPolicy = () => {
        setSelectedSLAPolicyId(null);
        setEditingSLAPolicy(null);
        setView('SLA_POLICY_FORM');
    };

    const handleEditSLAPolicy = (policy: SLAPolicy) => {
        setSelectedSLAPolicyId(policy.id);
        setEditingSLAPolicy(policy);
        setView('SLA_POLICY_FORM');
    };

    const handleDeleteSLAPolicy = async (policy: SLAPolicy) => {
        if (confirm(`Are you sure you want to delete SLA policy "${policy.name}"?`)) {
            try {
                await SLAService.deletePolicy(policy.id);
                addNotification(`SLA policy "${policy.name}" deleted successfully.`, 'success');
                setView('SLA_POLICIES');
            } catch (error: any) {
                addNotification(error.message || 'Failed to delete SLA policy', 'error');
            }
        }
    };

    const handleAcknowledgeSLABreach = async (breach: SLABreach) => {
        setSelectedSLABreach(breach);
        setIsSLABreachAcknowledgmentOpen(true);
    };

    const handleSLABreachAcknowledgment = async (data: { resolutionNotes: string }) => {
        try {
            await SLAService.acknowledgeBreach(selectedSLABreach!.id, data);
            setIsSLABreachAcknowledgmentOpen(false);
            setSelectedSLABreach(null);
            addNotification('SLA breach acknowledged successfully.', 'success');
        } catch (error: any) {
            addNotification(error.message || 'Failed to acknowledge SLA breach', 'error');
        }
    };

    const handleExportSLAReport = (format: 'csv' | 'pdf') => {
        addNotification(`SLA report exported as ${format.toUpperCase()}.`, 'success');
    };

    const handleTicketSubmit = async (
        ticketData: Omit<Ticket, 'id' | 'ticketId' | 'createdAt' | 'updatedAt' | 'history' | 'requestor' | 'status' | 'comments' | 'currentStageIndex' | 'blocking'>,
        action: 'SUBMIT' | 'DRAFT',
        editingTicketId?: number
    ) => {
        if (!currentUser) return;

        const isEditing = editingTicketId !== undefined;

        try {
            if (isEditing) {
                // Update existing ticket via API
                const response = await apiCall(`/api/tickets/${editingTicketId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        title: ticketData.title,
                        description: ticketData.description,
                        priority: ticketData.priority,
                        category: ticketData.category,
                        assigneeId: ticketData.assignee.id,
                    }),
                });

                if (response.ok) {
                    const updatedTicket = await response.json();
                    setTickets(tickets.map(t => t.id === editingTicketId ? parseTicketDates(updatedTicket) : t));
                    addNotification(`Ticket ${updatedTicket.ticketId} updated successfully.`, 'success');
                    setIsFormOpen(false);
                    setEditingTicket(null);
                    handleViewTicket(updatedTicket);
                } else {
                    const error = await response.json();
                    addNotification(error.error || 'Failed to update ticket', 'error');
                }
            } else {
                // Create new ticket via API
                const response = await apiCall('/api/tickets', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: ticketData.title,
                        description: ticketData.description,
                        priority: ticketData.priority,
                        category: ticketData.category,
                        requestorId: currentUser.id,
                        assigneeId: ticketData.assignee.id,
                        workflowId: ticketData.workflowId,
                    }),
                });

                if (response.ok) {
                    const newTicket = await response.json();
                    // Automation is handled by the backend event-driven architecture
                    addNotification(`New ticket ${newTicket.ticketId} created successfully.`, 'success');
                    setIsFormOpen(false);
                    setEditingTicket(null);
                    if (action === 'SUBMIT') {
                        handleViewTicket(newTicket);
                    }
                } else {
                    const error = await response.json();
                    addNotification(error.error || 'Failed to create ticket', 'error');
                }
            }
        } catch (error) {
            console.error('Failed to submit ticket:', error);
            addNotification('Failed to submit ticket. Please try again.', 'error');
        }
    };

    const handleUpdateTicketStatus = (ticketId: number, newStatus: Status, comment?: string, action?: string) => {
        if (!currentUser) return;
        setTickets(tickets.map(t => {
            if (t.id === ticketId) {
                let updatedTicket = { ...t, status: newStatus };
                return addHistoryLog(updatedTicket, currentUser, action || 'Status Change', `Status changed to ${newStatus}.`, comment);
            }
            return t;
        }));
        addNotification(`Ticket status updated to ${newStatus}.`, 'info');
    };

    const handleApproveReject = async (ticketId: number, action: 'APPROVE' | 'REJECT', comment?: string) => {
        if (!currentUser) return;

        try {
            const endpoint = action === 'APPROVE'
                ? `/api/tickets/${ticketId}/approve`
                : `/api/tickets/${ticketId}/reject`;

            const response = await apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify({ comment }),
            });

            if (response.ok) {
                const updatedTicket = await response.json();
                setTickets(tickets.map(t => t.id === ticketId ? parseTicketDates(updatedTicket) : t));
                addNotification(`Ticket has been ${action.toLowerCase() === 'approve' ? 'approved' : 'rejected'}.`, 'success');
            } else {
                const error = await response.json();
                addNotification(error.error || `Failed to ${action.toLowerCase()} ticket`, 'error');
            }
        } catch (error) {
            console.error(`Failed to ${action} ticket:`, error);
            addNotification(`Failed to ${action.toLowerCase()} ticket. Please try again.`, 'error');
        }
    };

    /**
     * Adds a user as a watcher to the specified ticket.
     * A watcher receives notifications for status changes, comments, and reassignments.
     * If the user is already a watcher, no action is taken.
     * @param ticketId The ID of the ticket to update.
     * @param userId The ID of the user to add as watcher.
     */
    const handleAddWatcher = (ticketId: number, userId: number) => {
        if (!currentUser) return;
        const user = users.find(u => u.id === userId);
        if (!user) return;
        setTickets(tickets.map(t => {
            if (t.id === ticketId) {
                const existingWatcherIndex = t.watchers.findIndex(w => w.id === userId);
                if (existingWatcherIndex === -1) {
                    // Add new watcher
                    let updatedTicket = { ...t, watchers: [...t.watchers, user] };
                    updatedTicket = addHistoryLog(updatedTicket, currentUser, 'Watcher Added', `${user.name} added as a watcher.`);
                    return updatedTicket;
                } else if (t.watchers[existingWatcherIndex].name !== user.name || t.watchers[existingWatcherIndex].role !== user.role) {
                    // Update existing watcher if user details have changed
                    let updatedTicket = {
                        ...t,
                        watchers: t.watchers.map(w => w.id === userId ? user : w)
                    };
                    updatedTicket = addHistoryLog(updatedTicket, currentUser, 'Watcher Updated', `${user.name}'s watcher details updated.`);
                    return updatedTicket;
                }
            }
            return t;
        }));
        addNotification('Watcher added successfully.', 'info');
    };

    const handleAddComment = (ticketId: number, commentText: string) => {
        if (!currentUser) return;
        const newComment: Comment = { id: Date.now(), user: currentUser, timestamp: new Date(), text: commentText };
        setTickets(tickets.map(t => t.id === ticketId ? { ...t, comments: [...t.comments, newComment], updatedAt: new Date() } : t));
    };

    const onReassignTicket = (ticketId: number, newAssigneeId: number) => {
        if (!currentUser) return;
        const newAssignee = users.find(u => u.id === newAssigneeId);
        if (!newAssignee) return;

        setTickets(tickets.map(t => {
            if (t.id === ticketId) {
                let updatedTicket = { ...t, assignee: newAssignee };
                return addHistoryLog(updatedTicket, currentUser, 'Reassigned', `Ticket reassigned to ${newAssignee.name}.`);
            }
            return t;
        }));
        addNotification(`Ticket reassigned to ${newAssignee.name}.`, 'info');
    };

    const handleUpdateProfile = (updatedUser: User) => {
        if (!currentUser) return;
        const updated = { ...currentUser, ...updatedUser };
        setCurrentUser(updated);
        setUsers(users.map(u => u.id === updated.id ? updated : u));
        addNotification('Profile updated successfully.', 'success');
        setView('DASHBOARD');
    };

    // --- Admin Panel Handlers ---
    const handleAddUser = (user: Omit<User, 'id'>) => {
        const newUser = { ...user, id: Math.max(0, ...users.map(u => u.id)) + 1 };
        setUsers([...users, newUser]);
        addNotification(`User ${newUser.name} created.`, 'success');
    };

    const handleUpdateUser = (user: User) => {
        setUsers(users.map(u => u.id === user.id ? user : u));
        if (currentUser?.id === user.id) {
            setCurrentUser(user);
        }
        addNotification(`User ${user.name} updated.`, 'success');
    };

    const onDeleteUser = (userId: number) => {
        if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            setUsers(users.filter(u => u.id !== userId));
            addNotification(`User deleted.`, 'info');
        }
    };

    const onUpdateWorkflows = (newWorkflows: Workflow[]) => {
        setWorkflows(newWorkflows);
        addNotification('Workflows updated successfully.', 'success');
    };

    // --- Render Logic ---
    if (!currentUser) {
        return <Login users={users} onLogin={handleLogin} />;
    }

    const renderView = () => {
        switch (view) {
            case 'DASHBOARD':
                return <Dashboard tickets={tickets} workflows={workflows} currentUser={currentUser} onViewTicket={handleViewTicket} onNewTicket={handleNewTicket} />;
            case 'TICKET_LIST':
                return <TicketList
                    tickets={filteredTickets}
                    allTickets={tickets}
                    users={users}
                    workflows={workflows}
                    filters={filters}
                    setFilters={setFilters}
                    onViewTicket={handleViewTicket}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />;
            case 'TICKET_DETAIL':
                return selectedTicket ? <TicketDetail
                    ticket={selectedTicket}
                    allTickets={tickets}
                    currentUser={currentUser}
                    users={users}
                    workflows={workflows}
                    onBack={handleBack}
                    onUpdateTicketStatus={handleUpdateTicketStatus}
                    onApproveReject={handleApproveReject}
                    onEditTicket={handleEditTicket}
                    onAddComment={handleAddComment}
                    onReassignTicket={onReassignTicket}
                    onViewTicket={(id) => handleViewTicket(id)}
                /> : <p>Ticket not found.</p>;
            case 'PROFILE':
                return <UserProfile currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onBack={() => setView('DASHBOARD')} />;
            case 'ADMIN':
                return <AdminPanel
                    users={users}
                    workflows={workflows}
                    assignmentRules={assignmentRules}
                    prioritizationRules={prioritizationRules}
                    escalationRules={escalationRules}
                    onAddUser={handleAddUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={onDeleteUser}
                    onUpdateWorkflows={onUpdateWorkflows}
                    onUpdateAssignmentRules={setAssignmentRules}
                    onUpdatePrioritizationRules={setPrioritizationRules}
                    onUpdateEscalationRules={setEscalationRules}
                />;
            case 'SLA_POLICIES':
                return <SLAPolicyList
                    onViewPolicy={handleViewSLAPolicy}
                    onEditPolicy={handleEditSLAPolicy}
                    onCreatePolicy={handleCreateSLAPolicy}
                    onDeletePolicy={handleDeleteSLAPolicy}
                />;
            case 'SLA_POLICY_FORM':
                return <SLAPolicyForm
                    initialData={editingSLAPolicy || undefined}
                    workflows={workflows}
                    onSubmit={async (data) => {
                        if (selectedSLAPolicyId) {
                            await SLAService.updatePolicy(selectedSLAPolicyId, data);
                            addNotification('SLA policy updated successfully.', 'success');
                        } else {
                            await SLAService.createPolicy(data);
                            addNotification('SLA policy created successfully.', 'success');
                        }
                        setView('SLA_POLICIES');
                    }}
                    onCancel={() => {
                        setView('SLA_POLICIES');
                        setSelectedSLAPolicyId(null);
                    }}
                />;
            case 'SLA_POLICY_DETAIL':
                return <SLAPolicyDetail
                    policyId={selectedSLAPolicyId!}
                    onBack={() => {
                        setSelectedSLAPolicyId(null);
                        setView('SLA_POLICIES');
                    }}
                    onEdit={handleEditSLAPolicy}
                    onDelete={handleDeleteSLAPolicy}
                />;
            case 'SLA_METRICS':
                return <SLAMetricList
                    onViewTicket={handleViewTicket}
                />;
            case 'SLA_BREACHES':
                return <SLABreachList
                    onViewTicket={handleViewTicket}
                    onAcknowledgeBreach={handleAcknowledgeSLABreach}
                />;
            case 'SLA_COMPLIANCE_REPORT':
                return <SLAComplianceReport
                    onExportReport={handleExportSLAReport}
                />;
            case 'SLA_DASHBOARD':
                return <SLADashboard
                    onViewPolicies={handleViewSLAPolicies}
                    onViewMetrics={handleViewSLAMetrics}
                    onViewBreaches={handleViewSLABreaches}
                    onViewReport={handleViewSLAReport}
                    onViewTicket={handleViewTicket}
                />;
            default:
                return <Dashboard tickets={tickets} workflows={workflows} currentUser={currentUser} onViewTicket={handleViewTicket} onNewTicket={handleNewTicket} onViewSLADashboard={handleViewSLADashboard} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                onNewTicket={handleNewTicket}
                onSearch={handleSearch}
            />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderView()}
            </main>
            <TicketForm
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingTicket(null); }}
                onSubmit={handleTicketSubmit}
                editingTicket={editingTicket}
                currentUser={currentUser}
                users={users}
                workflows={workflows}
                allTickets={tickets}
            />
            <div className="fixed bottom-4 right-4 z-50 space-y-4">
                {notifications.map(n => (
                    <NotificationToast key={n.id} notification={n} onDismiss={dismissNotification} />
                ))}
                {slaNotifications.map(n => (
                    <SLANotificationComponent
                        key={n.id}
                        notification={n}
                        onMarkAsRead={() => {
                            setSlaNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, isRead: true } : notif));
                        }}
                        onViewTicket={(ticketId) => handleViewTicket(ticketId)}
                    />
                ))}
            </div>

            {/* SLA Breach Acknowledgment Modal */}
            {isSLABreachAcknowledgmentOpen && selectedSLABreach && (
                <SLABreachAcknowledgment
                    breach={selectedSLABreach}
                    onSubmit={handleSLABreachAcknowledgment}
                    onCancel={() => setIsSLABreachAcknowledgmentOpen(false)}
                />
            )}
        </div>
    );
};

export default App;
