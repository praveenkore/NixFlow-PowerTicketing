/**
 * KBCategoryTree - Hierarchical category display component
 * 
 * Expandable tree view for nested categories with
 * article counts and navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Category } from '../types/kb';
import { getCategories } from '../services/kb.service';

interface KBCategoryTreeProps {
  categories: Category[];
  selectedCategoryId?: number | null;
  onCategorySelect?: (categoryId: number | null) => void;
  onCategoryToggle?: (categoryId: number) => void;
  expandedCategories?: Set<number>;
  showCounts?: boolean;
  level?: number;
}

/**
 * KBCategoryTree component
 */
export function KBCategoryTree({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryToggle,
  expandedCategories = new Set(),
  showCounts = true,
  level = 0,
}: KBCategoryTreeProps) {
  const [childrenMap, setChildrenMap] = useState<Map<number, Category[]>>(new Map());
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set());

  /**
   * Fetch children for a category
   */
  const fetchChildren = useCallback(
    async (categoryId: number) => {
      if (childrenMap.has(categoryId)) return;

      setLoadingChildren(prev => new Set(prev).add(categoryId));
      try {
        const result = await getCategories({ parentId: categoryId });
        setChildrenMap(prev => new Map(prev).set(categoryId, result.items));
      } catch (err) {
        console.error('Failed to load children:', err);
      } finally {
        setLoadingChildren(prev => {
          const newSet = new Set(prev);
          newSet.delete(categoryId);
          return newSet;
        });
      }
    },
    [childrenMap]
  );

  /**
   * Handle category click
   */
  const handleCategoryClick = useCallback(
    (category: Category) => {
      if (onCategorySelect) {
        onCategorySelect(category.id);
      }

      // Fetch children if not loaded and category has children
      if (
        !childrenMap.has(category.id) &&
        (category._count?.children || 0) > 0 &&
        onCategoryToggle
      ) {
        onCategoryToggle(category.id);
        fetchChildren(category.id);
      }
    },
    [onCategorySelect, onCategoryToggle, childrenMap, fetchChildren]
  );

  /**
   * Handle expand/collapse toggle
   */
  const handleToggle = useCallback(
    (e: React.MouseEvent, categoryId: number) => {
      e.stopPropagation();
      if (onCategoryToggle) {
        onCategoryToggle(categoryId);
      }

      // Fetch children if not loaded
      if (!childrenMap.has(categoryId)) {
        fetchChildren(categoryId);
      }
    },
    [onCategoryToggle, childrenMap, fetchChildren]
  );

  // Empty state
  if (categories.length === 0) {
    return null;
  }

  return (
    <ul className={`space-y-1 ${level > 0 ? 'ml-4' : ''}`}>
      {categories.map((category) => {
        const isSelected = selectedCategoryId === category.id;
        const isExpanded = expandedCategories.has(category.id);
        const hasChildren = (category._count?.children || 0) > 0;
        const children = childrenMap.get(category.id) || [];

        return (
          <li key={category.id}>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group ${
                isSelected
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={{ paddingLeft: `${level * 16 + 12}px` }}
            >
              {/* Expand/collapse button */}
              {hasChildren && (
                <button
                  onClick={(e) => handleToggle(e, category.id)}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {loadingChildren.has(category.id) ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  ) : (
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )}

              {/* Category icon */}
              <svg
                className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>

              {/* Category name */}
              <span className="flex-1 truncate">{category.name}</span>

              {/* Article count */}
              {showCounts && category._count?.articles !== undefined && (
                <span
                  className={`text-sm flex-shrink-0 ${
                    isSelected ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {category._count.articles}
                </span>
              )}
            </div>

            {/* Children */}
            {isExpanded && children.length > 0 && (
              <KBCategoryTree
                categories={children}
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={onCategorySelect}
                onCategoryToggle={onCategoryToggle}
                expandedCategories={expandedCategories}
                showCounts={showCounts}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default KBCategoryTree;
