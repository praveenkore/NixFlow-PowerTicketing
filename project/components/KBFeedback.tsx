/**
 * KBFeedback - "Was this helpful?" widget component
 * 
 * Simple yes/no feedback widget with optional comment
 * for article helpfulness tracking.
 */

import React, { useState, useCallback } from 'react';
import type { FeedbackInput } from '../types/kb';
import { submitFeedback } from '../services/kb.service';

interface KBFeedbackProps {
  articleId: number;
  readonly?: boolean;
}

/**
 * KBFeedback component
 */
export function KBFeedback({ articleId, readonly = false }: KBFeedbackProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle helpful/not helpful click
   */
  const handleFeedbackClick = useCallback(
    async (isHelpful: boolean) => {
      if (readonly || submitting || submitted) return;

      setSubmitting(true);
      setError(null);
      try {
        const feedbackData: FeedbackInput = {
          helpful: isHelpful,
          comment: showComment ? comment : undefined,
        };

        await submitFeedback(articleId, feedbackData);
        setHelpful(isHelpful);
        setSubmitted(true);
      } catch (err: any) {
        setError(err.message || 'Failed to submit feedback');
      } finally {
        setSubmitting(false);
      }
    },
    [articleId, readonly, submitting, submitted, showComment, comment]
  );

  /**
   * Handle submit with comment
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (helpful === null) return;
      await handleFeedbackClick(helpful);
    },
    [helpful, handleFeedbackClick]
  );

  // Submitted state
  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="font-medium">Thanks for your feedback!</span>
      </div>
    );
  }

  // Readonly state
  if (readonly) {
    return (
      <div className="text-sm text-gray-500">
        Feedback is disabled for this article.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-700 font-medium">Was this article helpful?</p>

      <div className="flex items-center gap-3">
        {/* Yes button */}
        <button
          onClick={() => handleFeedbackClick(true)}
          disabled={submitting || helpful !== null}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            helpful === true
              ? 'bg-green-100 text-green-700 border-2 border-green-500'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-400'
          } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span>Yes</span>
        </button>

        {/* No button */}
        <button
          onClick={() => {
            setHelpful(false);
            setShowComment(true);
          }}
          disabled={submitting || helpful !== null}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            helpful === false
              ? 'bg-red-100 text-red-700 border-2 border-red-500'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-400'
          } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          <span>No</span>
        </button>
      </div>

      {/* Comment form */}
      {showComment && helpful === false && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="feedback-comment" className="block text-sm font-medium text-gray-700 mb-1">
              Tell us more (optional)
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What could we improve?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </span>
              ) : (
                'Submit'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowComment(false);
                setHelpful(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

export default KBFeedback;
