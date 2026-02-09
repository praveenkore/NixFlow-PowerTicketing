import React, { useState } from 'react';
import { SLABreach, SLABreachAcknowledgmentFormData } from '../types/sla';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface SLABreachAcknowledgmentProps {
  breach: SLABreach;
  onSubmit: (data: SLABreachAcknowledgmentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SLABreachAcknowledgment: React.FC<SLABreachAcknowledgmentProps> = ({
  breach,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError('Resolution notes are required');
      return;
    }
    onSubmit({ resolutionNotes });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Acknowledge SLA Breach
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Breach Details */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-4">
              Breach Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Ticket ID:</span>
                <span className="font-medium text-gray-900 dark:text-white">#{breach.ticketId}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Breach Type:</span>
                <span className="font-medium text-gray-900 dark:text-white">{breach.breachType}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Target Time:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatTime(breach.targetTimeMins)}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Actual Time:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatTime(breach.actualTimeMins)}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Overage:</span>
                <span className="font-medium text-red-600 dark:text-red-400">+{formatTime(breach.overageMins)}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 block">Breached At:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(breach.breachedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Acknowledgment Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="resolutionNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resolution Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                id="resolutionNotes"
                value={resolutionNotes}
                onChange={(e) => {
                  setResolutionNotes(e.target.value);
                  if (error) setError(null);
                }}
                rows={6}
                placeholder="Describe the resolution steps taken to address this SLA breach..."
                className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  error
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                required
              />
              {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This information will be recorded in the breach history and visible to all stakeholders.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                )}
                Acknowledge Breach
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
