/**
 * KBRating - Star rating component
 * 
 * Interactive 5-star rating component with average rating display
 * and rating count.
 */

import React, { useState, useCallback } from 'react';
import type { RatingInput } from '../types/kb';

interface KBRatingProps {
  articleId: number;
  currentRating: number;
  ratingCount: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  showCount?: boolean;
}

/**
 * Star icon component
 */
function StarIcon({ filled, size = 20, onClick, key, onMouseEnter, onMouseLeave }: { filled: boolean; size?: number; onClick?: () => void; key?: React.Key; onMouseEnter?: () => void; onMouseLeave?: () => void }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      className={onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
      onClick={onClick}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

/**
 * KBRating component
 */
export function KBRating({
  articleId,
  currentRating,
  ratingCount,
  onRatingChange,
  readonly = false,
  showCount = true,
}: KBRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /**
   * Handle star click
   */
  const handleStarClick = useCallback(
    async (rating: number) => {
      if (readonly || submitting || submitted) return;

      setSubmitting(true);
      try {
        if (onRatingChange) {
          onRatingChange(rating);
        }
        setUserRating(rating);
        setSubmitted(true);
      } catch (err) {
        console.error('Failed to submit rating:', err);
      } finally {
        setSubmitting(false);
      }
    },
    [readonly, submitting, submitted, onRatingChange]
  );

  /**
   * Handle star hover
   */
  const handleStarHover = useCallback((rating: number) => {
    if (readonly || submitted) return;
    setHoverRating(rating);
  }, [readonly, submitted]);

  /**
   * Handle star leave
   */
  const handleStarLeave = useCallback(() => {
    setHoverRating(0);
  }, []);

  /**
   * Calculate display rating
   */
  const displayRating = hoverRating > 0 ? hoverRating : currentRating;

  return (
    <div className="flex items-center gap-3">
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(displayRating);
          return (
            <StarIcon
              key={star}
              filled={filled}
              size={24}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              onMouseLeave={handleStarLeave}
            />
          );
        })}
      </div>

      {/* Rating value and count */}
      <div className="flex flex-col">
        <span className="text-2xl font-semibold text-gray-900">
          {currentRating.toFixed(1)}
          <span className="text-sm text-gray-500 font-normal">/5</span>
        </span>
        {showCount && (
          <span className="text-sm text-gray-500">
            {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
          </span>
        )}
      </div>

      {/* Submitting indicator */}
      {submitting && (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      )}

      {/* Submitted indicator */}
      {submitted && !readonly && (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Thanks for rating!
        </span>
      )}
    </div>
  );
}

export default KBRating;
