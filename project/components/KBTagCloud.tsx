/**
 * KBTagCloud - Visual tag cloud component
 * 
 * Displays tags sized by popularity with clickable
 * links for filtering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Tag } from '../types/kb';
import { getTags, getPopularTags } from '../services/kb.service';

interface KBTagCloudProps {
  selectedTagIds?: number[];
  onTagSelect?: (tagId: number | null) => void;
  maxTags?: number;
  showPopular?: boolean;
  sortBy?: 'name' | 'popularity';
}

/**
 * Calculate font size based on article count
 */
function calculateFontSize(count: number, maxCount: number): string {
  const minSize = 12;
  const maxSize = 24;
  const ratio = count / maxCount;
  return `${minSize + (maxSize - minSize) * ratio}px`;
}

/**
 * Generate color based on tag name
 */
function generateColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
    'bg-cyan-100 text-cyan-700',
    'bg-amber-100 text-amber-700',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * KBTagCloud component
 */
export function KBTagCloud({
  selectedTagIds = [],
  onTagSelect,
  maxTags = 50,
  showPopular = false,
  sortBy = 'popularity',
}: KBTagCloudProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tags
   */
  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      setError(null);
      try {
        let result;
        if (showPopular) {
          result = await getPopularTags();
          setTags(result.tags);
        } else {
          result = await getTags({ pageSize: maxTags });
          setTags(result.items);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tags');
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [maxTags, showPopular]);

  /**
   * Sort tags
   */
  const sortedTags = React.useMemo(() => {
    return [...tags].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by popularity (article count)
        const countA = a._count?.articles || 0;
        const countB = b._count?.articles || 0;
        return countB - countA;
      }
    });
  }, [tags, sortBy]);

  /**
   * Calculate max count for font sizing
   */
  const maxCount = React.useMemo(() => {
    return Math.max(...tags.map(t => t._count?.articles || 0), 1);
  }, [tags]);

  /**
   * Handle tag click
   */
  const handleTagClick = useCallback(
    (tagId: number) => {
      if (onTagSelect) {
        // Toggle selection
        if (selectedTagIds.includes(tagId)) {
          onTagSelect(null);
        } else {
          onTagSelect(tagId);
        }
      }
    },
    [onTagSelect, selectedTagIds]
  );

  /**
   * Handle clear selection
   */
  const handleClearSelection = useCallback(() => {
    if (onTagSelect) {
      onTagSelect(null);
    }
  }, [onTagSelect]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
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
  if (tags.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586L13 14l-4-4 4 4M3 21h18M5 21H4a2 2 0 01-2-2v-6a2 2 0 012-2h2" />
        </svg>
        <p className="text-sm">No tags found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {showPopular ? 'Popular Tags' : 'All Tags'}
        </h3>
        {selectedTagIds.length > 0 && onTagSelect && (
          <button
            onClick={handleClearSelection}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Tag cloud */}
      <div className="flex flex-wrap gap-2">
        {sortedTags.slice(0, maxTags).map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          const count = tag._count?.articles || 0;
          const fontSize = calculateFontSize(count, maxCount);
          const colorClass = generateColor(tag.name);

          return (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`px-3 py-1 rounded-full transition-all hover:scale-110 hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : ''
              } ${colorClass}`}
              style={{ fontSize }}
              title={`${tag.name} (${count} articles)`}
            >
              #{tag.name}
              <span className="text-xs opacity-70 ml-1">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Tag count */}
      <p className="text-sm text-gray-500">
        Showing {Math.min(sortedTags.length, maxTags)} of {tags.length} tags
      </p>
    </div>
  );
}

export default KBTagCloud;
