
import React from 'react';
import { Status, Priority } from '../types';

interface BadgeProps {
  type: Status | Priority;
  children?: React.ReactNode;
}

const statusColors: Record<Status, string> = {
  [Status.Draft]: "bg-gray-200 text-gray-800",
  [Status.InApproval]: "bg-yellow-200 text-yellow-800",
  [Status.Approved]: "bg-blue-200 text-blue-800",
  [Status.InProgress]: "bg-purple-200 text-purple-800",
  [Status.Rejected]: "bg-red-200 text-red-800",
  [Status.Completed]: "bg-green-200 text-green-800",
  [Status.Closed]: "bg-gray-500 text-white",
};

const priorityColors: Record<Priority, string> = {
  [Priority.Low]: "bg-green-100 text-green-800",
  [Priority.Medium]: "bg-yellow-100 text-yellow-800",
  [Priority.High]: "bg-red-100 text-red-800",
  [Priority.Critical]: "bg-pink-200 text-pink-800 animate-pulse",
};


export const Badge: React.FC<BadgeProps> = ({ type, children }) => {
  const isStatus = Object.values(Status).includes(type as Status);
  const colors = isStatus ? statusColors : priorityColors;
  const colorClass = colors[type as keyof typeof colors] || "bg-gray-200 text-gray-800";
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
      {children || type}
    </span>
  );
};
