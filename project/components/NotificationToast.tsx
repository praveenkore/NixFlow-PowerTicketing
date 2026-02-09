import React, { useEffect } from 'react';
import { Notification } from '../types';
import { CheckCircleIcon, XCircleIcon, BellIcon } from './icons';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: number) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'info':
      default:
        return <BellIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Notification</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(notification.id)}
              className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
