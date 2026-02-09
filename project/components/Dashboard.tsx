import React, { useMemo } from 'react';
import { Ticket, User, Status, Priority, Workflow } from '../types';
import { Badge } from './Badge';
import { SLADashboard } from './SLADashboard';

interface DashboardProps {
    tickets: Ticket[];
    workflows: Workflow[];
    currentUser: User;
    onViewTicket: (ticket: Ticket) => void;
    onNewTicket: () => void;
    onViewSLADashboard?: () => void;
}

const StatCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg shadow-md ${color}`}>
        <h3 className="text-sm font-medium text-white opacity-90">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ tickets, workflows, currentUser, onViewTicket, onNewTicket, onViewSLADashboard }) => {
    // Optimize: Single-pass filtering using reduce instead of multiple filter calls
    const dashboardStats = useMemo(() => {
        const myTickets: Ticket[] = [];
        const assignedToMe: Ticket[] = [];
        const needingMyApproval: Ticket[] = [];
        const requestedByMe: Ticket[] = [];
        let openTickets = 0;

        for (const ticket of tickets) {
            // Skip tickets with missing required properties
            if (!ticket.requestor || !ticket.assignee) {
                continue;
            }

            // Check if ticket is open
            if (ticket.status !== Status.Completed && ticket.status !== Status.Closed) {
                openTickets++;
            }

            // Check if ticket is related to current user
            if (ticket.requestor.id === currentUser.id || ticket.assignee.id === currentUser.id) {
                myTickets.push(ticket);
            }

            // Check if ticket is assigned to current user
            if (ticket.assignee.id === currentUser.id) {
                assignedToMe.push(ticket);
            }

            // Check if ticket needs current user's approval
            if (ticket.status === Status.InApproval) {
                const workflow = workflows.find(w => w.id === ticket.workflowId);
                if (workflow && workflow.stages[ticket.currentStageIndex]?.approverRole === currentUser.role) {
                    needingMyApproval.push(ticket);
                }
            }

            // Check if ticket was requested by current user
            if (ticket.requestor.id === currentUser.id) {
                requestedByMe.push(ticket);
            }
        }

        return { myTickets, assignedToMe, needingMyApproval, requestedByMe, openTickets };
    }, [tickets, workflows, currentUser]);


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Open Tickets (All)" value={dashboardStats.openTickets} color="bg-blue-500 hover:bg-blue-600" />
                <StatCard title="Assigned to Me" value={dashboardStats.assignedToMe.length} color="bg-green-500 hover:bg-green-600" />
                <StatCard title="Needs My Approval" value={dashboardStats.needingMyApproval.length} color="bg-yellow-500 hover:bg-yellow-600" />
                <StatCard title="Tickets I've Requested" value={dashboardStats.requestedByMe.length} color="bg-purple-500 hover:bg-purple-600" />
            </div>

            {/* SLA Dashboard Widget */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">SLA Dashboard</h2>
                        <p className="text-indigo-100 mt-1">Monitor service level agreements and compliance</p>
                    </div>
                    {onViewSLADashboard && (
                        <button
                            onClick={onViewSLADashboard}
                            className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-md hover:bg-indigo-50 transition-colors duration-150"
                        >
                            View Full Dashboard
                        </button>
                    )}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-indigo-100 text-sm font-medium">Active Policies</div>
                        <div className="text-2xl font-bold text-white mt-1">--</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-indigo-100 text-sm font-medium">Compliance Rate</div>
                        <div className="text-2xl font-bold text-white mt-1">--%</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <div className="text-indigo-100 text-sm font-medium">Active Breaches</div>
                        <div className="text-2xl font-bold text-white mt-1">--</div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold">My Recent Tickets</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tickets assigned to you or requested by you, updated recently.</p>
                </div>
                {dashboardStats.myTickets.length === 0 ? (
                    <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No tickets to show.</h3>
                        <button onClick={onNewTicket} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            Create a New Ticket
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assignee</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {dashboardStats.myTickets
                                    .sort((a, b) => {
                                        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
                                        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
                                        return bTime - aTime;
                                    })
                                    .slice(0, 10)
                                    .map(ticket => ( // Show top 10 most recently updated
                                    <tr key={ticket.id} onClick={() => onViewTicket(ticket)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.ticketId || `Draft #${ticket.id}`}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap"><Badge type={ticket.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><Badge type={ticket.priority} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{ticket.assignee.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
