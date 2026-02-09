/**
 * KBDashboard - Admin dashboard component
 * 
 * Analytics, recent activity, popular articles,
 * and statistics for knowledge base management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Analytics } from '../types/kb';
import { getAnalytics } from '../services/kb.service';

interface KBDashboardProps {
  onNavigate?: (path: string) => void;
}

/**
 * KBDashboard component
 */
export function KBDashboard({ onNavigate }: KBDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  /**
   * Fetch analytics
   */
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  /**
   * Handle navigation
   */
  const handleNavigate = useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path);
      } else {
        window.location.href = path;
      }
    },
    [onNavigate]
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load analytics</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleNavigate('/kb/articles/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m6-2h.01M5 8h14a2 2 0 012-2v12a2 2 0 01-2 2H5a2 2 0 00-2-2v12a2 2 0 012-2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2z" />
            </svg>
            Create Article
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total articles */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Articles</h3>
            <span className="text-3xl font-bold text-blue-600">{analytics.totalArticles}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(analytics.publishedArticles / analytics.totalArticles) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{analytics.publishedArticles} Published</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(analytics.draftArticles / analytics.totalArticles) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{analytics.draftArticles} Drafts</span>
            </div>
          </div>
        </div>

        {/* Total views */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
            <span className="text-3xl font-bold text-purple-600">{analytics.totalViews}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.646-1.915 2.058-4.958-1.915L2.458 12z" />
            </svg>
            <span>All time</span>
          </div>
        </div>

        {/* Average rating */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
            <span className="text-3xl font-bold text-yellow-600">
              {analytics.averageRating.toFixed(1)}
              <span className="text-lg text-gray-400">/5</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539l1.07-3.292a1 1 0 00-.951-.69l1.07-3.292z" />
            </svg>
            <span>{analytics.totalRatings} ratings</span>
          </div>
        </div>

        {/* Total feedback */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Feedback</h3>
            <span className="text-3xl font-bold text-green-600">{analytics.totalFeedback}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7 10V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 01-2 2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2h2" />
            </svg>
            <span>{analytics.helpfulPercentage}% helpful</span>
          </div>
        </div>
      </div>

      {/* Top categories */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
        <div className="space-y-3">
          {analytics.topCategories.slice(0, 5).map((category) => (
            <div key={category.categoryId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{category.categoryName}</span>
                <span className="text-sm text-gray-500">{category.articleCount} articles</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(category.viewCount / analytics.totalViews) * 100}%` }}
                  ></div>
                </div>
              </div>
              <button
                onClick={() => handleNavigate(`/kb?category=${category.categoryId}`)}
                className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
              >
                View →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Popular tags */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Tags</h3>
        <div className="flex flex-wrap gap-2">
          {analytics.popularTags.slice(0, 10).map((tag) => (
            <button
              key={tag.tagId}
              onClick={() => handleNavigate(`/kb?tag=${tag.tagId}`)}
              className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <span>#{tag.tagName}</span>
              <span className="text-sm text-gray-500">({tag.articleCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {analytics.recentActivity.slice(0, 5).map((activity) => {
            const icon = {
              article_created: (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m6-2h.01M5 8h14a2 2 0 012-2v12a2 2 0 01-2 2H5a2 2 0 00-2-2v12a2 2 0 012-2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2h2" />
                </svg>
              ),
              article_published: (
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-2-2-2H5a2 2 0 00-2-2v12a2 2 0 01-2 2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2h2" />
                </svg>
              ),
              article_updated: (
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2-2v11a2 2 0 012 2h2m-6 9l2 2H7a2 2 0 00-2-2v12a2 2 0 012-2h2" />
                </svg>
              ),
              article_viewed: (
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            }[activity.type];

            return (
              <div key={activity.timestamp} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span>
                    <span className="text-gray-500 ml-2">
                      {activity.type === 'article_created' && 'created'}
                      {activity.type === 'article_published' && 'published'}
                      {activity.type === 'article_updated' && 'updated'}
                      {activity.type === 'article_viewed' && 'viewed'}
                    </span>
                    <a
                      href={`/kb/articles/${activity.articleId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {activity.articleTitle}
                    </a>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default KBDashboard;
