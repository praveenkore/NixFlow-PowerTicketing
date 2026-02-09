/**
 * KBCategoryList - Category sidebar/nav component
 * 
 * Shows category tree with article counts and navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import KBCategoryTree from './KBCategoryTree';
import type { Category } from '../types/kb';
import { getCategories } from '../services/kb.service';

interface KBCategoryListProps {
  selectedCategoryId?: number | null;
  onCategorySelect?: (categoryId: number | null) => void;
  showCounts?: boolean;
  expandAll?: boolean;
}

/**
 * KBCategoryList component
 */
export function KBCategoryList({
  selectedCategoryId,
  onCategorySelect,
  showCounts = true,
  expandAll = false,
}: KBCategoryListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  /**
   * Fetch categories
   */
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCategories({ parentId: null });
        setCategories(result.items);

        // Auto-expand if requested
        if (expandAll) {
          const allIds = new Set(result.items.map(c => c.id));
          setExpandedCategories(allIds);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [expandAll]);

  /**
   * Handle category select
   */
  const handleCategorySelect = useCallback(
    (categoryId: number | null) => {
      if (onCategorySelect) {
        onCategorySelect(categoryId);
      }
    },
    [onCategorySelect]
  );

  /**
   * Handle category expand/collapse
   */
  const handleCategoryToggle = useCallback((categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle expand all
   */
  const handleExpandAll = useCallback(() => {
    const allIds = new Set(categories.map(c => c.id));
    setExpandedCategories(allIds);
  }, [categories]);

  /**
   * Handle collapse all
   */
  const handleCollapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm">No categories found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with expand/collapse all */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExpandAll}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Expand All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleCollapseAll}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* All categories link */}
      <button
        onClick={() => handleCategorySelect(null)}
        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
          selectedCategoryId === null
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>All Articles</span>
        {showCounts && (
          <span className="ml-auto text-sm text-gray-500">
            {categories.reduce((sum, cat) => sum + (cat._count?.articles || 0), 0)}
          </span>
        )}
      </button>

      {/* Category tree */}
      <KBCategoryTree
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onCategorySelect={handleCategorySelect}
        onCategoryToggle={handleCategoryToggle}
        expandedCategories={expandedCategories}
        showCounts={showCounts}
      />
    </div>
  );
}

export default KBCategoryList;
