/**
 * KBArticleCard - Individual article card component
 * 
 * Displays article information in a card format with title, summary,
 * metadata (author, date, views, rating), and category/tags.
 */

import React from 'react';
import type { Article } from '../types/kb';
import { Badge } from './Badge';
import DOMPurify from 'dompurify';

interface KBArticleCardProps {
  article: Article;
  onClick?: (article: Article) => void;
  showStatus?: boolean;
  showAuthor?: boolean;
  showStats?: boolean;
  compact?: boolean;
  key?: React.Key;
}

/**
 * Status badge colors
 */
const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  PendingReview: 'bg-yellow-100 text-yellow-800',
  Published: 'bg-green-100 text-green-800',
  Archived: 'bg-gray-200 text-gray-600',
};

/**
 * Format date to readable string
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * KBArticleCard component
 */
export function KBArticleCard({
  article,
  onClick,
  showStatus = true,
  showAuthor = true,
  showStats = true,
  compact = false,
}: KBArticleCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(article);
    }
  };

  const isClickable = !!onClick;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isClickable ? 'cursor-pointer' : ''
      } ${compact ? 'p-4' : 'p-6'}`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header: Status and Category */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {showStatus && article.status && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                statusColors[article.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {article.status.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          )}
          {article.category && (
            <Badge variant="info" size="sm">
              {article.category.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-gray-900 mb-2 ${compact ? 'text-base' : 'text-lg'}`}>
        {article.title}
      </h3>

      {/* Summary */}
      {article.summary && !compact && (
        <p
          className="text-gray-600 text-sm mb-4 line-clamp-3"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(truncateText(article.summary, 200)),
          }}
        />
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mb-4">
          {article.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
              style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
            >
              #{tag.name}
            </span>
          ))}
          {article.tags.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500">
              +{article.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer: Author and Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          {showAuthor && article.author && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {article.author.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(article.createdAt)}
          </span>
        </div>

        {showStats && (
          <div className="flex items-center gap-4">
            {/* Views */}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {article.viewCount}
            </span>

            {/* Rating */}
            {article.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {article.rating.toFixed(1)}
                <span className="text-gray-400">({article.ratingCount})</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KBArticleCard;
