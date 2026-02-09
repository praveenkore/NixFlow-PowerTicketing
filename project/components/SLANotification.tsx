import React from 'react';
import { SLANotification as SLANotificationType, SLABreachType } from '../types/sla';
import { BellIcon, EyeIcon, CheckCircleIcon } from './icons';

interface SLANotificationProps {
  notification: SLANotificationType;
  onMarkAsRead: (id: number) => void;
  onViewTicket: (ticketId: number) => void;
}

export const SLANotificationComponent: React.FC<SLANotificationProps> = ({
  notification,
  onMarkAsRead,
  onViewTicket,
}) => {
  const getNotificationIcon = () => {
    if (notification.type === 'breach') {
      return <BellIcon className="h-6 w-6 text-red-500" />;
    }
    return <BellIcon className="h-6 w-6 text-yellow-500" />;
  };

  const getNotificationColor = () => {
    if (notification.type === 'breach') {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
    return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  };

  const formatTime = (minutes: number | undefined) => {
    if (minutes === undefined) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getBreachTypeLabel = (breachType: SLABreachType) => {
    const typeLabels: Record<SLABreachType, string> = {
      [SLABreachType.ResponseTime]: 'Response Time',
      [SLABreachType.ResolutionTime]: 'Resolution Time',
      [SLABreachType.ApprovalTime]: 'Approval Time',
    };
    return typeLabels[breachType];
  };

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleViewTicket = () => {
    // Extract ticket ID from the string (format: TKT-YYYYMMDD-####)
    const match = notification.ticketId.match(/TKT-(\d+)/);
    if (match) {
      onViewTicket(parseInt(match[1], 10));
    }
  };

  return (
    <div className={`p-4 rounded-lg ${getNotificationColor()}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                notification.type === 'breach'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {notification.type === 'breach' ? 'SLA Breach' : 'SLA Warning'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </div>
            {!notification.isRead && (
              <button
                onClick={handleMarkAsRead}
                className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                title="Mark as read"
              >
                <CheckCircleIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-900 dark:text-white mb-2">
            {notification.message}
          </p>

          {/* Ticket Info */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ticket:
            </span>
            <button
              onClick={handleViewTicket}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {notification.ticketId}
            </button>
          </div>

          {/* Breach Details */}
          {notification.type === 'breach' && notification.breachType && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getBreachTypeLabel(notification.breachType)}
                </span>
                {notification.overageMins !== undefined && (
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    +{formatTime(notification.overageMins)} overage
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                SLA Policy: {notification.slaPolicyName}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleViewTicket}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Ticket
            </button>
            {!notification.isRead && (
              <button
                onClick={handleMarkAsRead}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Mark as Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
