/**
 * KBRelatedArticles - Related content sidebar component
 * 
 * Shows 5 related articles based on category, tags,
 * and content similarity.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Article } from '../types/kb';
import { getRelatedArticles } from '../services/kb.service';

interface KBRelatedArticlesProps {
  articleId: number;
  maxArticles?: number;
  onArticleClick?: (article: Article) => void;
}

/**
 * KBRelatedArticles component
 */
export function KBRelatedArticles({ articleId, maxArticles = 5, onArticleClick }: KBRelatedArticlesProps) {
  const navigate = useNavigate();
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch related articles
   */
  useEffect(() => {
    const fetchRelated = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRelatedArticles(articleId);
        setRelatedArticles(data.relatedArticles.slice(0, maxArticles));
      } catch (err: any) {
        setError(err.message || 'Failed to load related articles');
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [articleId, maxArticles]);

  /**
   * Handle article click
   */
  const handleArticleClick = useCallback(
    (article: any) => {
      if (onArticleClick) {
        onArticleClick(article);
      } else {
        navigate(`/kb/articles/${article.articleId}`);
      }
    },
    [onArticleClick, navigate]
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-sm text-red-600">
        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  // Empty state
  if (relatedArticles.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No related articles found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {relatedArticles.map((article) => (
        <button
          key={article.articleId}
          onClick={() => handleArticleClick(article)}
          className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
        >
          {/* Title */}
          <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors mb-1 line-clamp-2">
            {article.title}
          </h4>

          {/* Summary */}
          {article.summary && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {article.summary}
            </p>
          )}

          {/* Relevance score (optional) */}
          {article.relevanceScore !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${article.relevanceScore * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">
                {Math.round(article.relevanceScore * 100)}% match
              </span>
            </div>
          )}

          {/* Category */}
          {article.category && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                {article.category.name}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default KBRelatedArticles;
