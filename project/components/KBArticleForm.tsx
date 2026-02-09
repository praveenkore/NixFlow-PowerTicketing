/**
 * KBArticleForm - Create/edit article form component
 * 
 * Rich text editor with validation, draft save,
 * and article metadata management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import KBArticleEditor from './KBArticleEditor';
import type { Article, ArticleInput, Category, Tag, KBStatus } from '../types/kb';
import { getCategories, getTags } from '../services/kb.service';

interface KBArticleFormProps {
  article?: Article;
  onSubmit: (data: ArticleInput) => Promise<void>;
  onCancel?: () => void;
}

/**
 * KBArticleForm component
 */
export function KBArticleForm({ article, onSubmit, onCancel }: KBArticleFormProps) {
  const [title, setTitle] = useState(article?.title || '');
  const [slug, setSlug] = useState(article?.slug || '');
  const [content, setContent] = useState(article?.content || '');
  const [summary, setSummary] = useState(article?.summary || '');
  const [status, setStatus] = useState<KBStatus>(article?.status || 'Draft');
  const [categoryId, setCategoryId] = useState<number | null>(article?.categoryId || null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(article?.tags?.map(t => t.id) || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch categories and tags
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesResult, tagsResult] = await Promise.all([
          getCategories(),
          getTags(),
        ]);
        setCategories(categoriesResult.items);
        setTags(tagsResult.items);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Generate slug from title
   */
  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  /**
   * Handle title change
   */
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSlug(generateSlug(newTitle));
  }, [generateSlug]);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (!slug.trim()) {
      newErrors.slug = 'Slug is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  /**
   * Handle submit
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setSaving(true);
      try {
        const data: ArticleInput = {
          title: title.trim(),
          slug: slug.trim(),
          content: content.trim(),
          summary: summary.trim() || undefined,
          status,
          categoryId: categoryId || undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        };

        await onSubmit(data);
      } catch (err: any) {
        console.error('Failed to submit article:', err);
        setErrors({ submit: err.message || 'Failed to save article' });
      } finally {
        setSaving(false);
      }
    },
    [title, slug, content, summary, status, categoryId, selectedTagIds, onSubmit, validateForm]
  );

  /**
   * Handle tag toggle
   */
  const handleTagToggle = useCallback((tagId: number) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading form...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {article ? 'Edit Article' : 'Create New Article'}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter article title"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
          Slug <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">/kb/articles/</span>
          <input
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="article-slug"
            className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
              errors.slug ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
      </div>

      {/* Summary */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
          Summary
        </label>
        <textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief description of the article (optional)"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {summary.length} / 500 characters
        </p>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Content <span className="text-red-500">*</span>
        </label>
        <KBArticleEditor
          value={content}
          onChange={setContent}
          placeholder="Write your article content here..."
          error={errors.content}
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as KBStatus)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          <option value="Draft">Draft</option>
          <option value="PendingReview">Pending Review</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          id="category"
          value={categoryId || ''}
          onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          <option value="">Select a category (optional)</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={tag.color && !isSelected ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
        {selectedTagIds.length === 0 && (
          <p className="text-sm text-gray-500">No tags selected</p>
        )}
      </div>

      {/* Error message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800">{errors.submit}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {article ? 'Update Article' : 'Create Article'}
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Help text */}
      <div className="text-sm text-gray-500 mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="font-medium mb-2">Tips for creating great articles:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Use clear, descriptive titles</li>
          <li>Write in a conversational, easy-to-understand style</li>
          <li>Include relevant tags for better discoverability</li>
          <li>Add a summary to help users quickly understand the content</li>
          <li>Choose appropriate categories for organization</li>
        </ul>
      </div>
    </form>
  );
}

export default KBArticleForm;
