import React, { useState, useMemo } from 'react';
import { Ticket, User, Status, Priority, Category, Workflow } from '../types';
import { Badge } from './Badge';
import { LockClosedIcon } from './icons';

/**
 * Safely formats a date value that may be a Date object, string, or null/undefined.
 * Handles API responses where dates are serialized as ISO strings.
 *
 * @param dateValue - The date value to format (Date, string, or null/undefined)
 * @param formatFn - The format function to use (default: toLocaleString)
 * @returns Formatted date string or fallback text
 */
const formatDate = (
  dateValue: Date | string | null | undefined,
  formatFn: (date: Date) => string = (date) => date.toLocaleString()
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

export interface FilterState {
    keyword: string;
    status: Status | 'ALL';
    priority: Priority | 'ALL';
    category: Category | 'ALL';
    requestorId: number | 'ALL';
    assigneeId: number | 'ALL';
    startDate: string;
    endDate: string;
    isExpedited?: boolean;
}

interface TicketListProps {
  tickets: Ticket[];
  allTickets: Ticket[]; // To check dependency status
  users: User[];
  workflows: Workflow[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onViewTicket: (ticket: Ticket) => void;
  // Server-side pagination props
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, allTickets, users, workflows, filters, setFilters, onViewTicket, currentPage, pageSize, totalCount, totalPages, onPageChange }) => {
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        onPageChange(1); // Reset to first page when filters change
    };

    const getDisplayStatus = (ticket: Ticket): string => {
        if (ticket.status === Status.InApproval && ticket.workflowId) {
            const workflow = workflows.find(w => w.id === ticket.workflowId);
            if (workflow && workflow.stages[ticket.currentStageIndex]) {
                const stage = workflow.stages[ticket.currentStageIndex];
                return `Pending: ${stage.name}`;
            }
        }
        return ticket.status;
    };

    const isTicketBlocked = (ticket: Ticket): boolean => {
      if (ticket.status === Status.Completed || ticket.status === Status.Closed || ticket.status === Status.Rejected) return false;
      const dependencies = ticket.dependencies || [];
      return dependencies.some(depId => {
        const depTicket = allTickets.find(t => t.id === depId);
        return depTicket && depTicket.status !== Status.Completed && depTicket.status !== Status.Closed;
      });
    }

    // Server-side pagination: tickets already contains only current page
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalCount);

    const goToPage = (page: number) => {
        onPageChange(page);
        // Scroll to top of table
        document.querySelector('.overflow-x-auto')?.scrollIntoView({ behavior: 'smooth' });
    };

    const exportToCSV = () => {
        const headers = ["Ticket ID", "Internal ID", "Title", "Requestor", "Assignee", "Status", "Blocked", "Priority", "Category", "Created At", "Last Updated", "Expedited", "Attachments", "Dependencies", "Blocking"];
        
        // Process tickets in chunks to avoid creating a large string in memory
        const chunkSize = 100; // Process 100 tickets at a time
        const chunks: string[] = [headers.join(',')];
        
        for (let i = 0; i < tickets.length; i += chunkSize) {
            const chunk = tickets.slice(i, i + chunkSize);
            const rows = chunk.map(t => [
                t.ticketId || 'N/A',
                t.id,
                `"${t.title.replace(/"/g, '""')}"`,
                t.requestor?.name || 'Unknown',
                t.assignee?.name || 'Unknown',
                getDisplayStatus(t),
                isTicketBlocked(t) ? 'Yes' : 'No',
                t.priority,
                t.category,
                t.createdAt?.toISOString() || '',
                t.updatedAt?.toISOString() || '',
                t.isExpedited ? 'Yes' : 'No',
                (t.attachments || []).length,
                (t.dependencies || []).join(';'),
                (t.blocking || []).join(';'),
            ].join(','));
            chunks.push(...rows);
        }

        const csvContent = "data:text/csv;charset=utf-8," + chunks.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "tickets_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const FilterInput: React.FC<{ name: string; value: string; onChange: any; placeholder: string; type?: string }> = ({ name, value, onChange, placeholder, type="text" }) => (
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
    );

    const FilterSelect: React.FC<{name: string; value: any; onChange: any; children: React.ReactNode}> = ({name, value, onChange, children}) => (
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
            {children}
        </select>
    );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Filter Tickets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="sm:col-span-2 md:col-span-4 lg:col-span-1">
                    <FilterInput name="keyword" value={filters.keyword} onChange={handleFilterChange} placeholder="Search by ID, keyword..." />
                </div>
                <FilterSelect name="status" value={filters.status} onChange={handleFilterChange}>
                    <option value="ALL">All Statuses</option>
                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </FilterSelect>

                <FilterSelect name="priority" value={filters.priority} onChange={handleFilterChange}>
                    <option value="ALL">All Priorities</option>
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </FilterSelect>

                 <FilterSelect name="category" value={filters.category} onChange={handleFilterChange}>
                    <option value="ALL">All Categories</option>
                    {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                </FilterSelect>
                
                <FilterSelect name="assigneeId" value={filters.assigneeId} onChange={handleFilterChange}>
                    <option value="ALL">All Assignees</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </FilterSelect>

                <div className="col-span-full sm:col-span-2 md:col-span-4 lg:col-span-3 flex items-center gap-2">
                    <label className="text-sm text-gray-500">Created:</label>
                    <FilterInput name="startDate" value={filters.startDate} onChange={handleFilterChange} placeholder="Start Date" type="date" />
                    <span className="text-gray-500">-</span>
                    <FilterInput name="endDate" value={filters.endDate} onChange={handleFilterChange} placeholder="End Date" type="date" />
                </div>
            </div>
        </div>
        <div className="p-4 flex justify-end">
            <button onClick={exportToCSV} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Export to CSV
            </button>
        </div>
        
        {tickets.length === 0 ? (
             <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No tickets found.</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters.</p>
            </div>
        ) : (
            <>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assignee</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Updated</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tickets.map(ticket => (
                        <tr key={ticket.id} onClick={() => onViewTicket(ticket)} className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 ${ticket.isExpedited ? 'border-l-4 border-pink-500' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {ticket.ticketId || `Draft #${ticket.id}`}
                                {ticket.isExpedited && <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-pink-100 text-pink-800">Expedited</span>}
                            </div>
                            <div className="text-sm text-gray-500">{ticket.title}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">By: {ticket.requestor?.name || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{ticket.assignee?.name || 'Unassigned'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                                <Badge type={ticket.status}>{getDisplayStatus(ticket)}</Badge>
                                {isTicketBlocked(ticket) && <LockClosedIcon className="h-4 w-4 text-gray-500" title="This ticket is blocked by one or more dependencies." />}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><Badge type={ticket.priority} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.updatedAt)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{startIndex}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{totalCount}</span> tickets
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            First
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
            </>
        )}
    </div>
  );
};