import React, { useState, useEffect } from 'react';
import { type SLATicketDetail, SLAStatus, SLABreach } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { ClockIcon, ExclamationTriangleIcon, ShieldCheckIcon } from './icons';

interface SLATicketDetailProps {
  ticketId: number;
  onViewTicket: (ticketId: number) => void;
}

export const SLATicketDetailComponent: React.FC<SLATicketDetailProps> = ({ ticketId, onViewTicket }) => {
  const [slaData, setSlaData] = useState<SLATicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSLAData = async () => {
      setLoading(true);
      setError(null);
      try {
        const metric = await SLAService.getMetricByTicketId(ticketId);
        if (metric) {
          setSlaData({
            ticketId: `TKT-${ticketId}`,
            ticketIdNumber: ticketId,
            title: 'SLA Information',
            status: 'Active',
            priority: 'Medium',
            category: 'GeneralInquiry',
            createdAt: metric.ticketCreatedAt,
            slaMetric: metric,
            slaPolicy: undefined,
            slaBreaches: metric.slaBreaches || [],
            isAtRisk: metric.status !== SLAStatus.WithinSLA,
            slaStatus: metric.status,
            remainingTime: {
              responseTime: metric.responseTimeMins !== null && metric.responseTimeMins < metric.targetResponseTimeMins
                ? metric.targetResponseTimeMins - metric.responseTimeMins
                : undefined,
              resolutionTime: metric.resolutionTimeMins !== null && metric.resolutionTimeMins < metric.targetResolutionTimeMins
                ? metric.targetResolutionTimeMins - metric.resolutionTimeMins
                : undefined,
              approvalTime: metric.approvalTimeMins !== null && metric.targetApprovalTimeMins !== null && metric.approvalTimeMins < metric.targetApprovalTimeMins
                ? metric.targetApprovalTimeMins - metric.approvalTimeMins
                : undefined,
            },
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch SLA data');
      } finally {
        setLoading(false);
      }
    };

    fetchSLAData();
  }, [ticketId]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status: SLAStatus) => {
    const statusColors: Record<SLAStatus, string> = {
      [SLAStatus.WithinSLA]: 'bg-green-100 text-green-800',
      [SLAStatus.Warning]: 'bg-yellow-100 text-yellow-800',
      [SLAStatus.Breached]: 'bg-red-100 text-red-800',
    };
    return statusColors[status];
  };

  const getProgressPercentage = (actual: number | null, target: number) => {
    if (actual === null) return 100;
    const percentage = (actual / target) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!slaData || !slaData.slaMetric) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No SLA data available for this ticket.</p>
        </div>
      </div>
    );
  }

  const metric = slaData.slaMetric;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <ClockIcon className="h-6 w-6 mr-2 text-blue-600" />
          SLA Information
        </h2>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(metric.status)}`}>
          {metric.status}
        </span>
      </div>

      {/* SLA Status Badge */}
      <div className={`p-4 rounded-lg mb-6 ${metric.status === SLAStatus.WithinSLA ? 'bg-green-50 dark:bg-green-900/20' : metric.status === SLAStatus.Warning ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center">
          {metric.status === SLAStatus.WithinSLA && (
            <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
          )}
          {metric.status === SLAStatus.Warning && (
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" />
          )}
          {metric.status === SLAStatus.Breached && (
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
          )}
          <span className="text-lg font-semibold">
            {metric.status === SLAStatus.WithinSLA && 'This ticket is within SLA targets'}
            {metric.status === SLAStatus.Warning && 'This ticket is approaching SLA limits'}
            {metric.status === SLAStatus.Breached && 'This ticket has breached SLA targets'}
          </span>
        </div>
      </div>

      {/* Time Tracking */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Time Tracking
        </h3>

        {/* Response Time */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Response Time</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 dark:text-white">
                {formatTime(metric.responseTimeMins || 0)} / {formatTime(metric.targetResponseTimeMins)}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${getProgressPercentage(metric.responseTimeMins, metric.targetResponseTimeMins)}%`,
                backgroundColor: getProgressColor(getProgressPercentage(metric.responseTimeMins, metric.targetResponseTimeMins)),
              }}
            ></div>
          </div>
          {slaData.remainingTime?.responseTime !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {slaData.remainingTime.responseTime > 0
                ? `${formatTime(slaData.remainingTime.responseTime)} remaining`
                : 'Target exceeded'}
            </div>
          )}
        </div>

        {/* Resolution Time */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Resolution Time</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 dark:text-white">
                {formatTime(metric.resolutionTimeMins || 0)} / {formatTime(metric.targetResolutionTimeMins)}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${getProgressPercentage(metric.resolutionTimeMins, metric.targetResolutionTimeMins)}%`,
                backgroundColor: getProgressColor(getProgressPercentage(metric.resolutionTimeMins, metric.targetResolutionTimeMins)),
              }}
            ></div>
          </div>
          {slaData.remainingTime?.resolutionTime !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {slaData.remainingTime.resolutionTime > 0
                ? `${formatTime(slaData.remainingTime.resolutionTime)} remaining`
                : 'Target exceeded'}
            </div>
          )}
        </div>

        {/* Approval Time */}
        {metric.targetApprovalTimeMins && (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Approval Time</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatTime(metric.approvalTimeMins || 0)} / {formatTime(metric.targetApprovalTimeMins)}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${getProgressPercentage(metric.approvalTimeMins, metric.targetApprovalTimeMins)}%`,
                  backgroundColor: getProgressColor(getProgressPercentage(metric.approvalTimeMins, metric.targetApprovalTimeMins)),
                }}
              ></div>
            </div>
            {slaData.remainingTime?.approvalTime !== undefined && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {slaData.remainingTime.approvalTime > 0
                  ? `${formatTime(slaData.remainingTime.approvalTime)} remaining`
                  : 'Target exceeded'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SLA Breaches */}
      {slaData.slaBreaches && slaData.slaBreaches.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
            SLA Breaches ({slaData.slaBreaches.length})
          </h3>
          <div className="space-y-3">
            {slaData.slaBreaches.map((breach) => (
              <div
                key={breach.id}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {breach.breachType}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(breach.breachedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Target:</span>{' '}
                      {formatTime(breach.targetTimeMins)}
                      {' | '}
                      <span className="font-medium">Actual:</span>{' '}
                      <span className="text-red-600 dark:text-red-400">
                        {formatTime(breach.actualTimeMins)}
                      </span>
                      {' | '}
                      <span className="font-medium">Overage:</span>{' '}
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        +{formatTime(breach.overageMins)}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    breach.status === 'Open'
                      ? 'bg-red-100 text-red-800'
                      : breach.status === 'Acknowledged'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {breach.status}
                  </span>
                </div>
                {breach.resolutionNotes && (
                  <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
                      Resolution Notes:
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {breach.resolutionNotes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLA Policy Info */}
      {metric.slaPolicy && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            SLA Policy
          </h3>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p>
                <span className="font-medium">Policy:</span> {metric.slaPolicy.name}
              </p>
              <p>
                <span className="font-medium">Response Target:</span> {formatTime(metric.targetResponseTimeMins)}
              </p>
              <p>
                <span className="font-medium">Resolution Target:</span> {formatTime(metric.targetResolutionTimeMins)}
              </p>
              {metric.targetApprovalTimeMins && (
                <p>
                  <span className="font-medium">Approval Target:</span> {formatTime(metric.targetApprovalTimeMins)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
