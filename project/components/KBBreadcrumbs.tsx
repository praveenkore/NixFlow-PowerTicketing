/**
 * KBBreadcrumbs - Navigation breadcrumbs component
 * 
 * Shows category/article path for navigation context.
 */

import React from 'react';
import type { Article } from '../types/kb';

interface KBBreadcrumbsProps {
  article: Article;
  onNavigate?: (path: string) => void;
}

/**
 * KBBreadcrumbs component
 */
export function KBBreadcrumbs({ article, onNavigate }: KBBreadcrumbsProps) {
  const items = [
    { label: 'Knowledge Base', path: '/kb' },
    ...(article.category ? [{ label: article.category.name, path: `/kb?category=${article.category.id}` }] : []),
    { label: article.title, path: `/kb/articles/${article.id}` },
  ];

  /**
   * Handle breadcrumb click
   */
  const handleBreadcrumbClick = (path: string, index: number) => {
    // Don't navigate to the last item (current page)
    if (index === items.length - 1) return;

    if (onNavigate) {
      onNavigate(path);
    } else {
      // Default navigation using window.location
      window.location.href = path;
    }
  };

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}

            <button
              onClick={() => handleBreadcrumbClick(item.path, index)}
              disabled={isLast}
              className={`truncate max-w-xs ${
                isLast
                  ? 'text-gray-900 font-medium cursor-default'
                  : 'text-gray-600 hover:text-blue-700 transition-colors'
              }`}
            >
              {item.label}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default KBBreadcrumbs;
