import React, { useState, useEffect } from 'react';
import { SLAPolicyFormData, Category, Priority } from '../types/sla';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface SLAPolicyFormProps {
  initialData?: SLAPolicyFormData;
  workflows: Array<{ id: number; name: string }>;
  onSubmit: (data: SLAPolicyFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SLAPolicyForm: React.FC<SLAPolicyFormProps> = ({
  initialData,
  workflows,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<SLAPolicyFormData>(
    initialData || {
      name: '',
      description: '',
      isActive: true,
      responseTimeMins: 60,
      resolutionTimeMins: 480,
      approvalTimeMins: null,
      warningThreshold: 80,
      category: null,
      priority: null,
      workflowId: null,
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Policy name is required';
    }

    if (formData.responseTimeMins <= 0) {
      newErrors.responseTimeMins = 'Response time must be greater than 0';
    }

    if (formData.resolutionTimeMins <= 0) {
      newErrors.resolutionTimeMins = 'Resolution time must be greater than 0';
    }

    if (formData.approvalTimeMins !== null && formData.approvalTimeMins <= 0) {
      newErrors.approvalTimeMins = 'Approval time must be greater than 0';
    }

    if (formData.warningThreshold < 0 || formData.warningThreshold > 100) {
      newErrors.warningThreshold = 'Warning threshold must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        warningThreshold: formData.warningThreshold / 100,
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? value === ''
            ? null
            : Number(value)
          : type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        {initialData ? 'Edit SLA Policy' : 'Create New SLA Policy'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Policy Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Hardware Support SLA"
            className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.name
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
            required
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the purpose and scope of this SLA policy..."
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Active Policy
          </label>
        </div>

        {/* Time Targets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="responseTimeMins" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Response Time (mins) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="responseTimeMins"
              name="responseTimeMins"
              value={formData.responseTimeMins}
              onChange={handleChange}
              min="1"
              className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.responseTimeMins
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              required
            />
            {errors.responseTimeMins && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.responseTimeMins}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="resolutionTimeMins" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resolution Time (mins) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="resolutionTimeMins"
              name="resolutionTimeMins"
              value={formData.resolutionTimeMins}
              onChange={handleChange}
              min="1"
              className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.resolutionTimeMins
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
              required
            />
            {errors.resolutionTimeMins && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.resolutionTimeMins}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="approvalTimeMins" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Approval Time (mins)
            </label>
            <input
              type="number"
              id="approvalTimeMins"
              name="approvalTimeMins"
              value={formData.approvalTimeMins || ''}
              onChange={handleChange}
              min="1"
              placeholder="Optional"
              className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.approvalTimeMins
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
            />
            {errors.approvalTimeMins && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.approvalTimeMins}
              </p>
            )}
          </div>
        </div>

        {/* Warning Threshold */}
        <div>
          <label htmlFor="warningThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Warning Threshold (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="warningThreshold"
            name="warningThreshold"
            value={formData.warningThreshold}
            onChange={handleChange}
            min="0"
            max="100"
            className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.warningThreshold
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Warning will be triggered when time reaches this percentage of the SLA target
          </p>
          {errors.warningThreshold && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.warningThreshold}
            </p>
          )}
        </div>

        {/* Matching Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category || 'ALL'}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Categories</option>
              {Object.values(Category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave as "All Categories" to apply to all tickets
            </p>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority || 'ALL'}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Priorities</option>
              {Object.values(Priority).map((pri) => (
                <option key={pri} value={pri}>
                  {pri}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave as "All Priorities" to apply to all tickets
            </p>
          </div>

          <div>
            <label htmlFor="workflowId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workflow
            </label>
            <select
              id="workflowId"
              name="workflowId"
              value={formData.workflowId || 'ALL'}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">All Workflows</option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave as "All Workflows" to apply to all tickets
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            )}
            {initialData ? 'Update Policy' : 'Create Policy'}
          </button>
        </div>
      </form>
    </div>
  );
};
