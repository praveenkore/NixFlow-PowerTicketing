/**
 * KBArticleDetail - Full article view component
 * 
 * Displays complete article content with metadata, author info,
 * tags, attachments, ratings, and related articles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import KBRating from './KBRating';
import KBFeedback from './KBFeedback';
import KBAttachmentList from './KBAttachmentList';
import KBRelatedArticles from './KBRelatedArticles';
import KBBreadcrumbs from './KBBreadcrumbs';
import { Badge } from './Badge';
import type { Article } from '../types/kb';
import { getArticleById, recordView } from '../services/kb.service';
import DOMPurify from 'dompurify';

interface KBArticleDetailProps {
  articleId?: number;
  onEdit?: (article: Article) => void;
  onDelete?: (articleId: number) => void;
  onNavigate?: (path: string) => void;
}

/**
 * Format date to readable string
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate reading time
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
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
 * KBArticleDetail component
 */
export function KBArticleDetail({ articleId: propArticleId, onEdit, onDelete, onNavigate }: KBArticleDetailProps) {
  const articleId = propArticleId || 0;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewRecorded, setViewRecorded] = useState(false);

  /**
   * Fetch article
   */
  const fetchArticle = useCallback(async () => {
    if (!articleId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getArticleById(articleId);
      setArticle(data);

      // Record view (only once)
      if (!viewRecorded) {
        await recordView(articleId);
        setViewRecorded(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [articleId, viewRecorded]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  /**
   * Handle edit
   */
  const handleEdit = useCallback(() => {
    if (article && onEdit) {
      onEdit(article);
    }
  }, [article, onEdit]);

  /**
   * Handle delete
   */
  const handleDelete = useCallback(() => {
    if (article && onDelete && window.confirm('Are you sure you want to delete this article?')) {
      onDelete(article.id);
      if (onNavigate) onNavigate('/kb');
    }
  }, [article, onDelete, onNavigate]);

  /**
   * Handle rating change
   */
  const handleRatingChange = useCallback((rating: number) => {
    if (article) {
      setArticle({ ...article, rating, ratingCount: article.ratingCount + 1 });
    }
  }, [article]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading article...</p>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load article</h3>
        <p className="text-red-600 mb-4">{error || 'Article not found'}</p>
        <button
          onClick={() => onNavigate ? onNavigate('/kb') : window.location.href = '/kb'}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Knowledge Base
        </button>
      </div>
    );
  }

  const readingTime = calculateReadingTime(article.content);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <KBBreadcrumbs article={article} />

      {/* Article Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        {/* Status and category */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              statusColors[article.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {article.status.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          {article.category && (
            <Badge variant="info">{article.category.name}</Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

        {/* Summary */}
        {article.summary && (
          <p className="text-lg text-gray-600 mb-6">{article.summary}</p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">{article.author?.name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(article.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{readingTime} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{article.viewCount} views</span>
          </div>
        </div>

        {/* Action buttons */}
        {(onEdit || onDelete) && (
          <div className="flex gap-2 mb-6">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md"
                style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Article Content */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div
          className="prose prose-blue max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
        />
      </div>

      {/* Attachments */}
      {article.attachments && article.attachments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attachments</h2>
          <KBAttachmentList attachments={article.attachments} />
        </div>
      )}

      {/* Rating and Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Rate this article</h2>
          <KBRating
            articleId={article.id}
            currentRating={article.rating}
            ratingCount={article.ratingCount}
            onRatingChange={handleRatingChange}
          />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Was this helpful?</h2>
          <KBFeedback articleId={article.id} />
        </div>
      </div>

      {/* Related Articles */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Articles</h2>
        <KBRelatedArticles articleId={article.id} />
      </div>
    </div>
  );
}

export default KBArticleDetail;
