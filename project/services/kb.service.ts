/**
 * Knowledge Base Service - API communication layer for KB operations
 * 
 * This service handles all HTTP requests to the Knowledge Base API endpoints
 * including Articles, Categories, Tags, Ratings, Feedback, and Search.
 */

// API base URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Custom error class for KB operations
 */
export class KBError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'KBError';
  }
}

/**
 * Pagination result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Search filters
 */
export interface SearchFilters {
  query: string;
  categoryIds?: number[];
  tagIds?: number[];
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'recent' | 'popular' | 'rating';
}

/**
 * Article filters
 */
export interface ArticleFilters {
  categoryId?: number;
  tagId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'recent' | 'popular' | 'rating' | 'title';
}

/**
 * Category filters
 */
export interface CategoryFilters {
  parentId?: number | null;
  page?: number;
  pageSize?: number;
}

/**
 * Tag filters
 */
export interface TagFilters {
  page?: number;
  pageSize?: number;
}

/**
 * Rating input
 */
export interface RatingInput {
  rating: number;
  comment?: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Make authenticated API request
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new KBError(
      errorData.error || 'Request failed',
      response.status,
      errorData.code
    );
  }

  return response.json();
}

// ==================== Article Methods ====================

/**
 * KB-SVC-02: Get articles with pagination
 */
export async function getArticles(filters: ArticleFilters = {}): Promise<PaginatedResult<any>> {
  const params = new URLSearchParams();
  if (filters.categoryId) params.append('categoryId', String(filters.categoryId));
  if (filters.tagId) params.append('tagId', String(filters.tagId));
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);

  const queryString = params.toString();
  return apiCall<PaginatedResult<any>>(`/api/kb/articles?${queryString}`);
}

/**
 * KB-SVC-03: Get article by ID
 */
export async function getArticleById(id: number): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}`);
}

/**
 * KB-SVC-04: Create new article
 */
export async function createArticle(data: {
  title: string;
  slug: string;
  content: string;
  summary?: string;
  status?: string;
  categoryId?: number;
  tagIds?: number[];
}): Promise<any> {
  return apiCall<any>('/api/kb/articles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * KB-SVC-05: Update article
 */
export async function updateArticle(
  id: number,
  data: {
    title?: string;
    content?: string;
    summary?: string;
    status?: string;
    categoryId?: number | null;
    tagIds?: number[];
  }
): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * KB-SVC-06: Delete (archive) article
 */
export async function deleteArticle(id: number): Promise<void> {
  await apiCall<void>(`/api/kb/articles/${id}`, {
    method: 'DELETE',
  });
}

/**
 * KB-SVC-07: Search articles
 */
export async function searchArticles(filters: SearchFilters): Promise<PaginatedResult<any>> {
  const params = new URLSearchParams();
  params.append('query', filters.query);
  if (filters.categoryIds?.length) {
    filters.categoryIds.forEach(id => params.append('categoryIds', String(id)));
  }
  if (filters.tagIds?.length) {
    filters.tagIds.forEach(id => params.append('tagIds', String(id)));
  }
  if (filters.status) params.append('status', filters.status);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);

  const queryString = params.toString();
  return apiCall<PaginatedResult<any>>(`/api/kb/search?${queryString}`);
}

/**
 * KB-SVC-10: Rate article
 */
export async function rateArticle(id: number, data: RatingInput): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}/rate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * KB-SVC-11: Record article view
 */
export async function recordView(id: number): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}/view`, {
    method: 'POST',
  });
}

// ==================== Category Methods ====================

/**
 * KB-SVC-08: Get categories
 */
export async function getCategories(filters: CategoryFilters = {}): Promise<PaginatedResult<any>> {
  const params = new URLSearchParams();
  if (filters.parentId !== undefined) {
    params.append('parentId', filters.parentId === null ? 'null' : String(filters.parentId));
  }
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

  const queryString = params.toString();
  return apiCall<PaginatedResult<any>>(`/api/kb/categories?${queryString}`);
}

/**
 * Get category tree
 */
export async function getCategoryTree(): Promise<any[]> {
  return apiCall<any[]>('/api/kb/categories/tree');
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: number): Promise<any> {
  return apiCall<any>(`/api/kb/categories/${id}`);
}

/**
 * Create category
 */
export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
}): Promise<any> {
  return apiCall<any>('/api/kb/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update category
 */
export async function updateCategory(
  id: number,
  data: {
    name?: string;
    description?: string;
    parentId?: number | null;
  }
): Promise<any> {
  return apiCall<any>(`/api/kb/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete category
 */
export async function deleteCategory(id: number): Promise<void> {
  await apiCall<void>(`/api/kb/categories/${id}`, {
    method: 'DELETE',
  });
}

// ==================== Tag Methods ====================

/**
 * KB-SVC-09: Get tags
 */
export async function getTags(filters: TagFilters = {}): Promise<PaginatedResult<any>> {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

  const queryString = params.toString();
  return apiCall<PaginatedResult<any>>(`/api/kb/tags?${queryString}`);
}

/**
 * Get popular tags
 */
export async function getPopularTags(): Promise<{ tags: any[] }> {
  return apiCall<{ tags: any[] }>('/api/kb/tags/popular');
}

/**
 * Get tag by ID
 */
export async function getTagById(id: number): Promise<any> {
  return apiCall<any>(`/api/kb/tags/${id}`);
}

/**
 * Create tag
 */
export async function createTag(data: {
  name: string;
  slug: string;
  color?: string;
}): Promise<any> {
  return apiCall<any>('/api/kb/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update tag
 */
export async function updateTag(
  id: number,
  data: {
    name?: string;
    color?: string;
  }
): Promise<any> {
  return apiCall<any>(`/api/kb/tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete tag
 */
export async function deleteTag(id: number): Promise<void> {
  await apiCall<void>(`/api/kb/tags/${id}`, {
    method: 'DELETE',
  });
}

// ==================== Analytics Methods ====================

/**
 * KB-SVC-12: Get analytics
 */
export async function getAnalytics(): Promise<any> {
  return apiCall<any>('/api/kb/analytics');
}

/**
 * Get article statistics
 */
export async function getArticleStatistics(id: number): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}/statistics`);
}

/**
 * Get related articles
 */
export async function getRelatedArticles(id: number): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}/related`);
}

/**
 * Get article versions
 */
export async function getArticleVersions(id: number): Promise<{ versions: any[] }> {
  return apiCall<{ versions: any[] }>(`/api/kb/articles/${id}/versions`);
}

/**
 * Get article version
 */
export async function getArticleVersion(id: number, version: number): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}/versions/${version}`);
}

/**
 * Submit feedback
 */
export async function submitFeedback(id: number, data: {
  helpful: boolean;
  comment?: string;
}): Promise<any> {
  return apiCall<any>(`/api/kb/articles/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export default {
  // Article methods
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
  rateArticle,
  recordView,
  // Category methods
  getCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  // Tag methods
  getTags,
  getPopularTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  // Analytics methods
  getAnalytics,
  getArticleStatistics,
  getRelatedArticles,
  getArticleVersions,
  getArticleVersion,
  submitFeedback,
  KBError,
};
