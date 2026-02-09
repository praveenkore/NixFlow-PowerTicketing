/**
 * KBViewer - Public article viewer component
 * 
 * Clean read-only view for sharing articles
 * with minimal UI elements.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Article } from '../types/kb';
import { getArticleById, recordView } from '../services/kb.service';
import DOMPurify from 'dompurify';

interface KBViewerProps {
  articleId: number;
  slug?: string;
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
 * KBViewer component
 */
export function KBViewer({ articleId, slug }: KBViewerProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch article
   */
  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getArticleById(articleId);
        setArticle(data);

        // Record view
        await recordView(articleId);
      } catch (err: any) {
        setError(err.message || 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading article...</p>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h1>
        <p className="text-gray-600 mb-6">{error || 'The article you are looking for does not exist or has been removed.'}</p>
        <a
          href="/kb"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
        >
          Browse Knowledge Base
        </a>
      </div>
    );
  }

  const readingTime = calculateReadingTime(article.content);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo/Title */}
              <a href="/kb" className="text-xl font-bold text-gray-900 hover:text-blue-700 transition-colors">
                Knowledge Base
              </a>

              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-600">
                <a href="/kb" className="hover:text-blue-700 transition-colors">
                  KB
                </a>
                <span>/</span>
                <span className="font-medium">{article.title}</span>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <a
                href={`/kb/articles/${article.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                View in App
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Article header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

            {article.summary && (
              <p className="text-lg text-gray-600 mb-4">{article.summary}</p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7h-14z" />
                </svg>
                <span>{article.author?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5z" />
                </svg>
                <span>{formatDate(article.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{readingTime} min read</span>
              </div>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
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

          {/* Article content */}
          <div className="p-8">
            <div
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
            />
          </div>

          {/* Attachments */}
          {article.attachments && article.attachments.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
              <div className="space-y-2">
                {article.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    download={attachment.fileName}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-2xl">
                      {attachment.mimeType.startsWith('image/') ? '🖼️' :
                       attachment.mimeType.startsWith('video/') ? '🎬' :
                       attachment.mimeType.startsWith('audio/') ? '🎵' :
                       attachment.mimeType.includes('pdf') ? '📄' :
                       attachment.mimeType.includes('word') ? '📝' :
                       attachment.mimeType.includes('excel') ? '📊' :
                       attachment.mimeType.includes('powerpoint') ? '📽️' :
                       attachment.mimeType.includes('zip') ? '📦' : '📎'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{attachment.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(attachment.uploadedAt).toLocaleDateString()} • {(attachment.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 013-3h10a3 3 0 013 3v-1m-4 4h.01M5 8h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 00-2 2v12a2 2 0 012-2h2" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Article last updated on {formatDate(article.updatedAt)} • {article.viewCount} views
          </p>
          <p className="mt-2">
            Powered by <a href="/kb" className="text-blue-600 hover:underline">NixFlow Knowledge Base</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} NixFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default KBViewer;
