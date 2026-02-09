import React, { useState, useEffect } from 'react';
import { SLAPolicy, Category, Priority } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { PencilSquareIcon, TrashIcon, ArrowUturnLeftIcon, ClockIcon, TagIcon } from './icons';

interface SLAPolicyDetailProps {
  policyId: number;
  onBack: () => void;
  onEdit: (policy: SLAPolicy) => void;
  onDelete: (policy: SLAPolicy) => void;
}

export const SLAPolicyDetail: React.FC<SLAPolicyDetailProps> = ({
  policyId,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [policy, setPolicy] = useState<SLAPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await SLAService.getPolicy(policyId);
        setPolicy(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch SLA policy');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [policyId]);

  const handleDelete = () => {
    if (!policy) return;
    if (!window.confirm(`Are you sure you want to delete SLA policy "${policy.name}"?`)) {
      return;
    }
    onDelete(policy);
  };

  const formatTime = (minutes: number) => {
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
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-gray-600 dark:text-gray-400">Policy not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowUturnLeftIcon className="h-5 w-5 mr-1" />
          Back to Policies
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(policy)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <PencilSquareIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Policy Details Card */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {policy.name}
            </h1>
            {policy.description && (
              <p className="text-gray-600 dark:text-gray-400">{policy.description}</p>
            )}
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              policy.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {policy.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Targets */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Time Targets
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Response Time
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatTime(policy.responseTimeMins)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resolution Time
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatTime(policy.resolutionTimeMins)}
                </span>
              </div>
              {policy.approvalTimeMins && (
                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Approval Time
                  </span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatTime(policy.approvalTimeMins)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Warning Threshold
                </span>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {policy.warningThreshold}%
                </span>
              </div>
            </div>
          </div>

          {/* Matching Criteria */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <TagIcon className="h-5 w-5 mr-2" />
              Matching Criteria
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  Category
                </span>
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {policy.category || 'All Categories'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  Priority
                </span>
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {policy.priority || 'All Priorities'}
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                  Workflow ID
                </span>
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {policy.workflowId ? `Workflow #${policy.workflowId}` : 'All Workflows'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {policy._count && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Statistics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 block">
                  Associated Tickets
                </span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {policy._count.slaMetrics}
                </span>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 block">
                  SLA Breaches
                </span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {policy._count.slaBreaches}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-medium">Created:</span>{' '}
              {new Date(policy.createdAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(policy.updatedAt).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Created By ID:</span> {policy.createdById}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
