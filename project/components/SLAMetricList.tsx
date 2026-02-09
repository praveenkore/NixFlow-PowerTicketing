import React, { useState, useEffect, useCallback } from 'react';
import { SLAMetric, SLAStatus, Category, Priority } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface SLAMetricListProps {
  onViewTicket: (ticketId: number) => void;
}

export const SLAMetricList: React.FC<SLAMetricListProps> = ({ onViewTicket }) => {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<SLAStatus | 'ALL'>('ALL');
  const [slaPolicyIdFilter, setSlaPolicyIdFilter] = useState<number | undefined>(undefined);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (slaPolicyIdFilter) params.slaPolicyId = slaPolicyIdFilter;

      const response = await SLAService.getMetrics(params);
      setMetrics(response.metrics);
      setTotalCount(response.pagination.totalCount);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SLA metrics');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, slaPolicyIdFilter]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchMetrics();
  };

  const getStatusBadge = (status: SLAStatus) => {
    const statusStyles: Record<SLAStatus, string> = {
      [SLAStatus.WithinSLA]: 'bg-green-100 text-green-800',
      [SLAStatus.Warning]: 'bg-yellow-100 text-yellow-800',
      [SLAStatus.Breached]: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
        {status}
      </span>
    );
  };

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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
        <button onClick={fetchMetrics} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Metrics</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SLAStatus | 'ALL');
                handleFilterChange();
              }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Statuses</option>
              {Object.values(SLAStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
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
        </div>
      </div>

      {/* Metrics Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {metrics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No SLA metrics found.</p>
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
                    Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Resolution Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Approval Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.map((metric) => (
                  <tr
                    key={metric.id}
                    onClick={() => onViewTicket(metric.ticketId)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      #{metric.ticketId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {metric.slaPolicy?.name || `Policy #${metric.slaPolicyId}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(metric.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(metric.responseTimeMins)} / {formatTime(metric.targetResponseTimeMins)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(metric.resolutionTimeMins)} / {formatTime(metric.targetResolutionTimeMins)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(metric.approvalTimeMins)} / {formatTime(metric.targetApprovalTimeMins)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(metric.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {metrics.length > 0 && (
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
