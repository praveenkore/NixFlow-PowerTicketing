/**
 * KBArticleList - Article grid/list view component
 * 
 * Displays a collection of articles in a responsive grid or list format
 * with filtering, sorting, and pagination support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import KBArticleCard from './KBArticleCard';
import type { Article, ArticleFilters } from '../types/kb';
import { useKB } from '../hooks/useKB';

interface KBArticleListProps {
  filters?: ArticleFilters;
  onArticleClick?: (article: Article) => void;
  viewMode?: 'grid' | 'list';
  compact?: boolean;
  showLoadMore?: boolean;
}

/**
 * Sort options
 */
const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'title', label: 'Alphabetical' },
];

/**
 * View mode toggle icons
 */
function ViewModeToggle({ mode, onChange }: { mode: 'grid' | 'list'; onChange: (mode: 'grid' | 'list') => void }) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded-md transition-colors ${
          mode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Grid view"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded-md transition-colors ${
          mode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="List view"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * KBArticleList component
 */
export function KBArticleList({
  filters = {},
  onArticleClick,
  viewMode: externalViewMode,
  compact = false,
  showLoadMore = true,
}: KBArticleListProps) {
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('recent');
  const { articles, loading, error, pagination, fetchArticles } = useKB();

  // Use external view mode if provided, otherwise use internal state
  const viewMode = externalViewMode || internalViewMode;

  /**
   * Fetch articles when filters change
   */
  useEffect(() => {
    fetchArticles({ ...filters, sortBy: sortBy as any });
  }, [filters, sortBy]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
  }, []);

  /**
   * Handle load more
   */
  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchArticles({
        ...filters,
        sortBy: sortBy as any,
        page: pagination.page + 1,
      });
    }
  }, [pagination, filters, sortBy, fetchArticles]);

  /**
   * Handle article click
   */
  const handleArticleClick = useCallback(
    (article: Article) => {
      if (onArticleClick) {
        onArticleClick(article);
      }
    },
    [onArticleClick]
  );

  // Loading state
  if (loading && articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading articles...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load articles</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchArticles({ ...filters, sortBy: sortBy as any })}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
        <p className="text-gray-600">
          {filters.categoryId || filters.tagId || filters.status
            ? 'Try adjusting your filters to see more results.'
            : 'Get started by creating your first knowledge base article.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{pagination?.total || 0}</span>
          <span>articles found</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          {!externalViewMode && (
            <ViewModeToggle mode={viewMode} onChange={setInternalViewMode} />
          )}
        </div>
      </div>

      {/* Articles grid/list */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }
      >
        {articles.map((article) => (
          <KBArticleCard
            article={article}
            onClick={onArticleClick ? handleArticleClick : undefined}
            compact={compact}
            key={article.id}
          />
        ))}
      </div>

      {/* Load more button */}
      {showLoadMore && pagination && pagination.page < pagination.totalPages && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                Load More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Pagination info */}
      {pagination && (
        <div className="text-center text-sm text-gray-500">
          Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} articles
        </div>
      )}
    </div>
  );
}

export default KBArticleList;
