/**
 * KBSearchResults - Search results display component
 * 
 * Displays search results with highlighted matches,
 * relevance scores, and filtering options.
 */

import React from 'react';
import KBArticleCard from './KBArticleCard';
import type { SearchResult, SearchFilters } from '../types/kb';

interface KBSearchResultsProps {
  results: SearchResult[];
  filters: SearchFilters;
  onResultClick?: (result: SearchResult) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  loading?: boolean;
}

/**
 * Highlight search terms in text
 */
function highlightText(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.split(/\s+/).join('|')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-800">$1</mark>');
}

/**
 * Sort options
 */
const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
];

/**
 * KBSearchResults component
 */
export function KBSearchResults({
  results,
  filters,
  onResultClick,
  onFiltersChange,
  loading = false,
}: KBSearchResultsProps) {
  /**
   * Handle sort change
   */
  const handleSortChange = (sortBy: 'relevance' | 'recent' | 'popular' | 'rating') => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, sortBy });
    }
  };

  /**
   * Handle result click
   */
  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600 mb-4">
          We couldn't find any articles matching "<strong>{filters.query}</strong>".
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Try these tips:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Check your spelling</li>
            <li>Try different keywords</li>
            <li>Use more general terms</li>
            <li>Browse categories instead</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </h2>
          <span className="text-gray-500">
            for "<strong>{filters.query}</strong>"
          </span>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-gray-600">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={filters.sortBy || 'relevance'}
            onChange={(e) => handleSortChange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => (
          <div
            key={result.articleId}
            onClick={() => handleResultClick(result)}
            className="cursor-pointer group"
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
              {/* Title with highlighting */}
              <h3
                className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors"
                dangerouslySetInnerHTML={{
                  __html: highlightText(result.title, filters.query),
                }}
              />

              {/* Summary with highlighting */}
              {result.summary && (
                <p
                  className="text-gray-600 text-sm mb-4 line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(result.summary, filters.query),
                  }}
                />
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                {/* Category */}
                {result.category && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                    {result.category.name}
                  </span>
                )}

                {/* Relevance score */}
                {result.relevanceScore !== undefined && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11z" />
                    </svg>
                    <span>{Math.round(result.relevanceScore * 100)}% match</span>
                  </div>
                )}

                {/* Views */}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.646-1.915 2.058-4.958-1.915L2.458 12z" />
                  </svg>
                  {result.viewCount}
                </span>

                {/* Rating */}
                {result.ratingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539l1.07-3.292a1 1 0 00-.951-.69l1.07-3.292z" />
                    </svg>
                    {result.rating.toFixed(1)}
                    <span className="text-gray-400">({result.ratingCount})</span>
                  </span>
                )}

                {/* Published date */}
                {result.publishedAt && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5z" />
                    </svg>
                    {new Date(result.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Tags */}
              {result.tags && result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
                      style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
                    >
                      #{tag.name}
                    </span>
                  ))}
                  {result.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs text-gray-500 rounded-md">
                      +{result.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination info */}
      <div className="text-center text-sm text-gray-500">
        Showing top {results.length} results
      </div>
    </div>
  );
}

export default KBSearchResults;
