import React, { useState, useEffect } from 'react';
import { SLADashboardStats, SLABreach } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { ChevronRightIcon, ShieldCheckIcon, ClockIcon, ExclamationTriangleIcon } from './icons';

interface SLADashboardProps {
  onViewPolicies: () => void;
  onViewMetrics: () => void;
  onViewBreaches: () => void;
  onViewReport: () => void;
  onViewTicket: (ticketId: number) => void;
}

export const SLADashboard: React.FC<SLADashboardProps> = ({
  onViewPolicies,
  onViewMetrics,
  onViewBreaches,
  onViewReport,
  onViewTicket,
}) => {
  const [stats, setStats] = useState<SLADashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await SLAService.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch SLA dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getComplianceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Dashboard</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Dashboard</h1>
        <button
          onClick={onViewReport}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Generate Compliance Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Active Policies</span>
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.activePolicies}
          </span>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Active Tickets with SLA</span>
          <span className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.totalMetrics}
          </span>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Tickets Within SLA</span>
          <span className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.totalMetrics - stats.openBreaches - stats.acknowledgedBreaches}
          </span>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Tickets in Warning</span>
          <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.acknowledgedBreaches}
          </span>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Breached Tickets</span>
          <span className="text-3xl font-bold text-red-600 dark:text-red-400">
            {stats.openBreaches}
          </span>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Compliance Rate</span>
          <span className={`text-3xl font-bold ${getComplianceRateColor(stats.currentComplianceRate)}`}>
            {stats.currentComplianceRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onViewPolicies}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
          >
            <span className="font-medium text-gray-900 dark:text-white">SLA Policies</span>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={onViewMetrics}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
          >
            <span className="font-medium text-gray-900 dark:text-white">SLA Metrics</span>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={onViewBreaches}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
          >
            <span className="font-medium text-gray-900 dark:text-white">SLA Breaches</span>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </button>
          <button
            onClick={onViewReport}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
          >
            <span className="font-medium text-gray-900 dark:text-white">Compliance Report</span>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Recent Breaches */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-red-500" />
            Recent Breaches
          </h2>
          {stats.recentBreaches.length > 0 && (
            <button
              onClick={onViewBreaches}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All Breaches
            </button>
          )}
        </div>
        {stats.recentBreaches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No recent breaches.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentBreaches.slice(0, 5).map((breach) => (
              <div
                key={breach.id}
                onClick={() => onViewTicket(breach.ticketId)}
                className="p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors duration-150"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Ticket #{breach.ticketId}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {breach.breachType}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Overage:</span>{' '}
                      <span className="text-red-600 dark:text-red-400">
                        +{formatTime(breach.overageMins)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(breach.breachedAt).toLocaleString()}
                    </div>
                  </div>
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Breached Policies */}
      {stats.topBreachedPolicies.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Top Breached Policies
          </h2>
          <div className="space-y-3">
            {stats.topBreachedPolicies.slice(0, 5).map((item) => (
              <div
                key={item.policyId}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.policyName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Policy #{item.policyId}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.breachCount} breaches
                  </span>
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
