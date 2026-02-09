/**
 * useKB Custom Hook - Knowledge Base state management
 * 
 * This hook provides a convenient interface for KB operations with
 * loading states, error handling, and automatic refresh.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import kbService, {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
  rateArticle,
  recordView,
  getCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getTags,
  getPopularTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getAnalytics,
  getArticleStatistics,
  getRelatedArticles,
  getArticleVersions,
  getArticleVersion,
  submitFeedback,
  type ArticleFilters,
  type SearchFilters,
  type PaginatedResult,
} from '../services/kb.service';
import type {
  Article,
  Category,
  Tag,
  ArticleInput,
  ArticleUpdateInput,
  CategoryInput,
  CategoryUpdateInput,
  TagInput,
  TagUpdateInput,
  RatingInput,
  FeedbackInput,
  KBStatus,
} from '../types/kb';

/**
 * Hook result interface
 */
interface UseKBResult {
  articles: Article[];
  categories: Category[];
  tags: Tag[];
  article: Article | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null;
  fetchArticles: (filters?: any) => Promise<void>;
  fetchCategories: (filters?: { parentId?: number | null }) => Promise<void>;
  fetchTags: () => Promise<void>;
  createNewArticle: (data: ArticleInput) => Promise<Article>;
  updateExistingArticle: (id: number, data: ArticleUpdateInput) => Promise<Article>;
  deleteExistingArticle: (id: number) => Promise<void>;
  searchKB: (filters: any) => Promise<void>;
  rateArticleHandler: (id: number, data: RatingInput) => Promise<void>;
  recordViewHandler: (id: number) => Promise<void>;
  createNewCategory: (data: CategoryInput) => Promise<Category>;
  updateExistingCategory: (id: number, data: CategoryUpdateInput) => Promise<Category>;
  deleteExistingCategory: (id: number) => Promise<void>;
  createNewTag: (data: TagInput) => Promise<Tag>;
  updateExistingTag: (id: number, data: TagUpdateInput) => Promise<Tag>;
  deleteExistingTag: (id: number) => Promise<void>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Main KB hook
 */
export function useKB(): UseKBResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

  /**
   * Fetch articles with filters
   */
  const fetchArticles = useCallback(async (filters: ArticleFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getArticles(filters);
      setArticles(result.items);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch categories
   */
  const fetchCategories = useCallback(async (filters?: { parentId?: number | null }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCategories(filters || {});
      setCategories(result.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch tags
   */
  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTags();
      setTags(result.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create article
   */
  const createNewArticle = useCallback(async (data: ArticleInput) => {
    setLoading(true);
    setError(null);
    try {
      const article = await createArticle(data);
      setArticles(prev => [article, ...prev]);
      return article;
    } catch (err: any) {
      setError(err.message || 'Failed to create article');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update article
   */
  const updateExistingArticle = useCallback(async (id: number, data: ArticleUpdateInput) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateArticle(id, data);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update article');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete article
   */
  const deleteExistingArticle = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteArticle(id);
      setArticles(prev => prev.filter(a => a.id !== id));
      if (selectedArticle?.id === id) {
        setSelectedArticle(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete article');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedArticle]);

  /**
   * Search articles
   */
  const searchKB = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchArticles(filters);
      setArticles(result.items);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rate article
   */
  const rateArticleHandler = useCallback(async (id: number, data: RatingInput) => {
    try {
      await rateArticle(id, data);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, rating: data.rating, ratingCount: a.ratingCount + 1 } : a));
    } catch (err: any) {
      setError(err.message || 'Failed to rate article');
      throw err;
    }
  }, []);

  /**
   * Record view
   */
  const recordViewHandler = useCallback(async (id: number) => {
    try {
      await recordView(id);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, viewCount: a.viewCount + 1 } : a));
    } catch (err: any) {
      // Silent fail for views
      console.error('Failed to record view:', err);
    }
  }, []);

  /**
   * Create category
   */
  const createNewCategory = useCallback(async (data: CategoryInput) => {
    setLoading(true);
    setError(null);
    try {
      const category = await createCategory(data);
      setCategories(prev => [...prev, category]);
      return category;
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update category
   */
  const updateExistingCategory = useCallback(async (id: number, data: CategoryUpdateInput) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateCategory(id, data);
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete category
   */
  const deleteExistingCategory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create tag
   */
  const createNewTag = useCallback(async (data: TagInput) => {
    setLoading(true);
    setError(null);
    try {
      const tag = await createTag(data);
      setTags(prev => [...prev, tag]);
      return tag;
    } catch (err: any) {
      setError(err.message || 'Failed to create tag');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update tag
   */
  const updateExistingTag = useCallback(async (id: number, data: TagUpdateInput) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateTag(id, data);
      setTags(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update tag');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete tag
   */
  const deleteExistingTag = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete tag');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchArticles(),
      fetchCategories(),
      fetchTags(),
    ]);
  }, [fetchArticles, fetchCategories, fetchTags]);

  return {
    articles,
    categories,
    tags,
    article: selectedArticle,
    loading,
    error,
    pagination,
    fetchArticles,
    fetchCategories,
    fetchTags,
    createNewArticle,
    updateExistingArticle,
    deleteExistingArticle,
    searchKB,
    rateArticleHandler,
    recordViewHandler,
    createNewCategory,
    updateExistingCategory,
    deleteExistingCategory,
    createNewTag,
    updateExistingTag,
    deleteExistingTag,
    clearError,
    refresh,
  };
}

export default useKB;
