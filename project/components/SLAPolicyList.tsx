import React, { useState, useEffect, useCallback } from 'react';
import { SLAPolicy, Category, Priority } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { PencilSquareIcon, TrashIcon, EyeIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface SLAPolicyListProps {
  onViewPolicy: (policy: SLAPolicy) => void;
  onEditPolicy: (policy: SLAPolicy) => void;
  onCreatePolicy: () => void;
  onDeletePolicy: (policy: SLAPolicy) => void;
}

export const SLAPolicyList: React.FC<SLAPolicyListProps> = ({
  onViewPolicy,
  onEditPolicy,
  onCreatePolicy,
  onDeletePolicy,
}) => {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [workflowIdFilter, setWorkflowIdFilter] = useState<number | undefined>(undefined);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (isActiveFilter !== undefined) params.isActive = isActiveFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (workflowIdFilter) params.workflowId = workflowIdFilter;

      const response = await SLAService.getPolicies(params);
      setPolicies(response.policies);
      setTotalCount(response.pagination.totalCount);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SLA policies');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, isActiveFilter, categoryFilter, priorityFilter, workflowIdFilter]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleDelete = async (policy: SLAPolicy) => {
    if (!window.confirm(`Are you sure you want to delete the SLA policy "${policy.name}"?`)) {
      return;
    }

    try {
      await SLAService.deletePolicy(policy.id);
      onDeletePolicy(policy);
      fetchPolicies();
    } catch (err: any) {
      alert(err.message || 'Failed to delete SLA policy');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchPolicies();
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
        <button onClick={fetchPolicies} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Policies</h1>
        <button
          onClick={onCreatePolicy}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Policy
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="isActiveFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="isActiveFilter"
              value={isActiveFilter === undefined ? 'ALL' : isActiveFilter.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setIsActiveFilter(value === 'ALL' ? undefined : value === 'true');
                handleFilterChange();
              }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as Category | 'ALL');
                handleFilterChange();
              }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Categories</option>
              {Object.values(Category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priorityFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              id="priorityFilter"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as Priority | 'ALL');
                handleFilterChange();
              }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Priorities</option>
              {Object.values(Priority).map((pri) => (
                <option key={pri} value={pri}>
                  {pri}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="workflowIdFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workflow ID
            </label>
            <input
              id="workflowIdFilter"
              type="number"
              value={workflowIdFilter || ''}
              onChange={(e) => {
                setWorkflowIdFilter(e.target.value ? Number(e.target.value) : undefined);
                handleFilterChange();
              }}
              placeholder="Filter by workflow ID"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {policies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No SLA policies found.</p>
            <button
              onClick={onCreatePolicy}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create your first SLA policy
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Resolution Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Warning Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{policy.name}</div>
                      {policy.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {policy.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {policy.category || 'All'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {policy.priority || 'All'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {policy.responseTimeMins} mins
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {policy.resolutionTimeMins} mins
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {policy.warningThreshold}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          policy.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewPolicy(policy)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => onEditPolicy(policy)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(policy)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {policies.length > 0 && (
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
