import React, { useState, useEffect, useCallback } from 'react';
import { SLABreach, SLABreachType, Category, Priority } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { EyeIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface SLABreachListProps {
  onViewTicket: (ticketId: number) => void;
  onAcknowledgeBreach: (breach: SLABreach) => void;
}

export const SLABreachList: React.FC<SLABreachListProps> = ({
  onViewTicket,
  onAcknowledgeBreach,
}) => {
  const [breaches, setBreaches] = useState<SLABreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [ticketIdFilter, setTicketIdFilter] = useState<number | undefined>(undefined);
  const [slaPolicyIdFilter, setSlaPolicyIdFilter] = useState<number | undefined>(undefined);
  const [breachTypeFilter, setBreachTypeFilter] = useState<SLABreachType | 'ALL'>('ALL');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<boolean | undefined>(undefined);

  const fetchBreaches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (ticketIdFilter) params.ticketId = ticketIdFilter;
      if (slaPolicyIdFilter) params.slaPolicyId = slaPolicyIdFilter;
      if (breachTypeFilter !== 'ALL') params.breachType = breachTypeFilter;
      if (acknowledgedFilter !== undefined) params.acknowledged = acknowledgedFilter;

      const response = await SLAService.getBreaches(params);
      setBreaches(response.breaches);
      setTotalCount(response.pagination.totalCount);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SLA breaches');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, ticketIdFilter, slaPolicyIdFilter, breachTypeFilter, acknowledgedFilter]);

  useEffect(() => {
    fetchBreaches();
  }, [fetchBreaches]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchBreaches();
  };

  const getBreachTypeBadge = (breachType: SLABreachType) => {
    const typeStyles: Record<SLABreachType, string> = {
      [SLABreachType.ResponseTime]: 'bg-blue-100 text-blue-800',
      [SLABreachType.ResolutionTime]: 'bg-green-100 text-green-800',
      [SLABreachType.ApprovalTime]: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeStyles[breachType]}`}>
        {breachType}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      Open: 'bg-red-100 text-red-800',
      Acknowledged: 'bg-yellow-100 text-yellow-800',
      Resolved: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button onClick={fetchBreaches} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Breaches</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="ticketIdFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ticket ID
            </label>
            <input
              id="ticketIdFilter"
              type="number"
              value={ticketIdFilter || ''}
              onChange={(e) => {
                setTicketIdFilter(e.target.value ? Number(e.target.value) : undefined);
                handleFilterChange();
              }}
              placeholder="Filter by ticket ID"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label htmlFor="slaPolicyIdFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SLA Policy ID
            </label>
            <input
              id="slaPolicyIdFilter"
              type="number"
              value={slaPolicyIdFilter || ''}
              onChange={(e) => {
                setSlaPolicyIdFilter(e.target.value ? Number(e.target.value) : undefined);
                handleFilterChange();
              }}
              placeholder="Filter by SLA policy ID"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label htmlFor="breachTypeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Breach Type
            </label>
            <select
              id="breachTypeFilter"
              value={breachTypeFilter}
              onChange={(e) => {
                setBreachTypeFilter(e.target.value as SLABreachType | 'ALL');
                handleFilterChange();
              }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Breach Types</option>
              {Object.values(SLABreachType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="acknowledgedFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Acknowledged Status
            </label>
            <select
              id="acknowledgedFilter"
              value={acknowledgedFilter === undefined ? 'ALL' : acknowledgedFilter.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setAcknowledgedFilter(value === 'ALL' ? undefined : value === 'true');
                handleFilterChange();
              }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All</option>
              <option value="true">Acknowledged</option>
              <option value="false">Not Acknowledged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Breaches Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {breaches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No SLA breaches found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Breach Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Breached At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Overage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acknowledged By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {breaches.map((breach) => (
                  <tr key={breach.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      #{breach.ticketId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBreachTypeBadge(breach.breachType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(breach.breachedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        +{breach.overageMins} mins
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(breach.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {breach.acknowledgedBy ? (
                        <div>
                          <div className="font-medium">{breach.acknowledgedBy.name}</div>
                          <div className="text-xs">{breach.acknowledgedBy.email}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewTicket(breach.ticketId)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="View Ticket"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {breach.status === 'Open' && (
                          <button
                            onClick={() => onAcknowledgeBreach(breach)}
                            className="px-3 py-1 text-xs font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                            title="Acknowledge Breach"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {breaches.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
