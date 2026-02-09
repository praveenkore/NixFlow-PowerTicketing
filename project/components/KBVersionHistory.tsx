/**
 * KBVersionHistory - Article version viewer component
 * 
 * Shows version history with diff comparison
 * and restore functionality.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { ArticleVersion } from '../types/kb';
import { getArticleVersions, getArticleVersion } from '../services/kb.service';

interface KBVersionHistoryProps {
  articleId: number;
  onRestore?: (version: number) => void;
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * KBVersionHistory component
 */
export function KBVersionHistory({ articleId, onRestore }: KBVersionHistoryProps) {
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<[ArticleVersion | null, ArticleVersion | null]>([null, null]);
  const [loading, setLoading] = useState(true);
  const [loadingVersion, setLoadingVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  /**
   * Fetch versions
   */
  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getArticleVersions(articleId);
        setVersions(data.versions);
      } catch (err: any) {
        setError(err.message || 'Failed to load versions');
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [articleId]);

  /**
   * Handle version select
   */
  const handleVersionSelect = useCallback(
    async (version: ArticleVersion) => {
      setLoadingVersion(version.version);

      try {
        const data = await getArticleVersion(articleId, version.version);
        setSelectedVersions([version, data]);
        setShowDiff(true);
      } catch (err: any) {
        console.error('Failed to load version:', err);
      } finally {
        setLoadingVersion(null);
      }
    },
    [articleId]
  );

  /**
   * Handle restore
   */
  const handleRestore = useCallback(
    async (version: ArticleVersion) => {
      if (onRestore && window.confirm(`Restore to version ${version.version}?`)) {
        onRestore(version.version);
      }
    },
    [onRestore]
  );

  /**
   * Handle clear selection
   */
  const handleClearSelection = useCallback(() => {
    setSelectedVersions([null, null]);
    setShowDiff(false);
  }, []);

  /**
   * Calculate diff (simple text diff)
   */
  const calculateDiff = useCallback((version1: string, version2: string) => {
    const lines1 = version1.split('\n');
    const lines2 = version2.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);

    let diffHtml = '';
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 === line2) {
        diffHtml += `<div class="bg-white">${escapeHtml(line1)}</div>`;
      } else {
        diffHtml += `<div class="bg-red-100 line-through">${escapeHtml(line1)}</div>`;
        diffHtml += `<div class="bg-green-100">${escapeHtml(line2)}</div>`;
      }
    }

    return diffHtml;
  }, []);

  /**
   * Escape HTML
   */
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (versions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 9l6-6M6 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 01-2 2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2h2" />
        </svg>
        <p className="text-sm text-gray-500">No version history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
        {selectedVersions[0] && (
          <button
            onClick={handleClearSelection}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Version list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-200">
          {versions.map((version) => {
            const isSelected = selectedVersions[0]?.id === version.id;

            return (
              <div
                key={version.id}
                onClick={() => handleVersionSelect(version)}
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                } ${loadingVersion === version.version ? 'opacity-50 cursor-wait' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">v{version.version}</span>
                  <span className="text-sm text-gray-600">{formatDate(version.createdAt)}</span>
                  {version.changes && (
                    <span className="text-xs text-gray-500 truncate max-w-xs">
                      {version.changes}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {onRestore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(version);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    disabled={loadingVersion === version.version}
                  >
                    Restore
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Diff view */}
      {showDiff && selectedVersions[0] && selectedVersions[1] && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Version Comparison</h3>
            <button
              onClick={handleClearSelection}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Version 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-red-600">v{selectedVersions[0].version}</span>
                <span className="text-sm text-gray-500">{formatDate(selectedVersions[0].createdAt)}</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap break-all">{selectedVersions[0].content}</pre>
              </div>
            </div>

            {/* Version 2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-green-600">v{selectedVersions[1].version}</span>
                <span className="text-sm text-gray-500">{formatDate(selectedVersions[1].createdAt)}</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap break-all">{selectedVersions[1].content}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version details */}
      {selectedVersions[0] && !showDiff && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Version v{selectedVersions[0].version}</h3>
            <div className="flex gap-2">
              <span className="text-sm text-gray-600">{formatDate(selectedVersions[0].createdAt)}</span>
              {selectedVersions[0].changes && (
                <span className="text-sm text-gray-500">• {selectedVersions[0].changes}</span>
              )}
              {onRestore && (
                <button
                  onClick={() => handleRestore(selectedVersions[0])}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Restore This Version
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <p className="text-gray-900">{selectedVersions[0].title}</p>
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium text-gray-700">Content</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap break-all">{selectedVersions[0].content}</pre>
              </div>
            </div>

            {/* Summary */}
            {selectedVersions[0].summary && (
              <div>
                <label className="text-sm font-medium text-gray-700">Summary</label>
                <p className="text-gray-900">{selectedVersions[0].summary}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-600">Created by</label>
                <p className="text-gray-900">User {selectedVersions[0].createdBy}</p>
              </div>
              <div>
                <label className="text-gray-600">Created at</label>
                <p className="text-gray-900">{formatDate(selectedVersions[0].createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KBVersionHistory;
