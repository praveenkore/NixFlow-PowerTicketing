import React, { useState, useEffect, useCallback } from 'react';
import { SLAComplianceReport as SLAComplianceReportType, Category, Priority, SLABreachType } from '../types/sla';
import { SLAService } from '../services/sla.service';
import { ChevronLeftIcon, ChevronRightIcon, DocumentDuplicateIcon } from './icons';

interface SLAComplianceReportProps {
  onExportReport: (format: 'csv' | 'pdf') => void;
}

export const SLAComplianceReport: React.FC<SLAComplianceReportProps> = ({ onExportReport }) => {
  const [report, setReport] = useState<SLAComplianceReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [slaPolicyId, setSlaPolicyId] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState<Category | 'ALL'>('ALL');
  const [priority, setPriority] = useState<Priority | 'ALL'>('ALL');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (slaPolicyId) params.slaPolicyId = slaPolicyId;
      if (category !== 'ALL') params.category = category;
      if (priority !== 'ALL') params.priority = priority;

      const data = await SLAService.getComplianceReport(params);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch compliance report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, slaPolicyId, category, priority]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGenerateReport = () => {
    fetchReport();
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    onExportReport(format);
  };

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button onClick={fetchReport} className="mt-2 text-red-600 dark:text-red-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Compliance Report</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Generate Report
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | 'ALL')}
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
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | 'ALL')}
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
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Total Tickets</span>
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {report.totalTickets}
          </span>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Within SLA</span>
          <span className="text-3xl font-bold text-green-600 dark:text-green-400">
            {report.ticketsWithinSLA}
          </span>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Warning</span>
          <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {report.ticketsWithWarning}
          </span>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400 block">Breached</span>
          <span className="text-3xl font-bold text-red-600 dark:text-red-400">
            {report.ticketsBreached}
          </span>
        </div>
      </div>

      {/* Compliance Rate */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Overall Compliance Rate
        </h2>
        <div className="text-center">
          <span className={`text-6xl font-bold ${getComplianceRateColor(report.complianceRate)}`}>
            {report.complianceRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Average Times */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Average Times
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400 block">Response Time</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatTime(report.avgResponseTime)}
            </span>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400 block">Resolution Time</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatTime(report.avgResolutionTime)}
            </span>
          </div>
          {report.avgApprovalTime && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400 block">Approval Time</span>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTime(report.avgApprovalTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Breaches by Type */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Breaches by Type
        </h2>
        <div className="space-y-3">
          {Object.entries(report.breachesByType).map(([type, count]) => {
            const countNum = count as number;
            const percentage = ((countNum / report.totalTickets) * 100).toFixed(1);
            return (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                    {countNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breaches by Priority */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Breaches by Priority
        </h2>
        <div className="space-y-3">
          {Object.entries(report.breachesByPriority).map(([priority, count]) => {
            const countNum = count as number;
            const percentage = ((countNum / report.totalTickets) * 100).toFixed(1);
            return (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{priority}</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                    {countNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
 
      {/* Breaches by Category */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Breaches by Category
        </h2>
        <div className="space-y-3">
          {Object.entries(report.breachesByCategory).map(([category, count]) => {
            const countNum = count as number;
            const percentage = ((countNum / report.totalTickets) * 100).toFixed(1);
            return (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                    {countNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Period */}
      <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Report Period:</span>{' '}
          {new Date(report.reportPeriod.startDate).toLocaleDateString()} to {new Date(report.reportPeriod.endDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
