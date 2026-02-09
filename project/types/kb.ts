/**
 * Knowledge Base Type Definitions for Frontend
 * 
 * This file contains TypeScript type definitions for Knowledge Base/Self-Service
 * features including articles, categories, tags, ratings, feedback, and search.
 */

/**
 * Knowledge Article Status enumeration
 */
export type KBStatus = 'Draft' | 'PendingReview' | 'Published' | 'Archived';

/**
 * Knowledge Category enumeration
 */
export type KBCategory = 'Hardware' | 'Software' | 'Network' | 'Security' | 'Access' | 'General' | 'Troubleshooting' | 'FAQ' | 'Procedures' | 'Policies';

/**
 * Knowledge Article interface
 */
export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  status: KBStatus;
  categoryId: number | null;
  category?: {
    id: number;
    name: KBCategory;
    slug: string;
    description: string | null;
  };
  authorId: number;
  author?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  viewCount: number;
  rating: number;
  ratingCount: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  versions?: ArticleVersion[];
  attachments?: ArticleAttachment[];
  _count?: {
    versions: number;
    ratings: number;
    views: number;
    feedback: number;
    attachments: number;
  };
}

/**
 * Knowledge Category interface
 */
export interface Category {
  id: number;
  name: KBCategory;
  slug: string;
  description: string | null;
  parentId: number | null;
  parent?: {
    id: number;
    name: KBCategory;
    slug: string;
  };
  children?: Category[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    articles: number;
    children: number;
  };
}

/**
 * Knowledge Tag interface
 */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    articles: number;
  };
}

/**
 * Article Version interface
 */
export interface ArticleVersion {
  id: number;
  articleId: number;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  changes: string | null;
  createdBy: number;
  createdAt: string;
}

/**
 * Article Rating interface
 */
export interface ArticleRating {
  id: number;
  articleId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Article View interface
 */
export interface ArticleView {
  id: number;
  articleId: number;
  userId: number;
  viewedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Article Feedback interface
 */
export interface ArticleFeedback {
  id: number;
  articleId: number;
  userId: number;
  helpful: boolean;
  comment: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Article Attachment interface
 */
export interface ArticleAttachment {
  id: number;
  articleId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * Search Result interface
 */
export interface SearchResult {
  articleId: number;
  title: string;
  slug: string;
  summary: string | null;
  relevanceScore: number;
  category?: {
    id: number;
    name: KBCategory;
    slug: string;
  };
  tags: Tag[];
  viewCount: number;
  rating: number;
  ratingCount: number;
  publishedAt: string | null;
}

/**
 * Analytics interface
 */
export interface Analytics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  pendingReviewArticles: number;
  archivedArticles: number;
  totalViews: number;
  totalRatings: number;
  averageRating: number;
  totalFeedback: number;
  helpfulPercentage: number;
  topCategories: Array<{
    categoryId: number;
    categoryName: KBCategory;
    articleCount: number;
    viewCount: number;
  }>;
  popularTags: Array<{
    tagId: number;
    tagName: string;
    articleCount: number;
  }>;
  recentActivity: Array<{
    type: 'article_created' | 'article_published' | 'article_updated' | 'article_viewed';
    articleId: number;
    articleTitle: string;
    userId: number;
    userName: string;
    timestamp: string;
  }>;
}

/**
 * Article Statistics interface
 */
export interface ArticleStatistics {
  articleId: number;
  totalViews: number;
  uniqueViews: number;
  totalRatings: number;
  averageRating: number;
  totalFeedback: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number;
  lastViewedAt: string | null;
  lastRatedAt: string | null;
  lastFeedbackAt: string | null;
}

/**
 * Related Articles interface
 */
export interface RelatedArticles {
  articleId: number;
  relatedArticles: Array<{
    articleId: number;
    title: string;
    slug: string;
    summary: string | null;
    relevanceScore: number;
    category?: {
      id: number;
      name: KBCategory;
      slug: string;
    };
  }>;
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
 * Article input for creation
 */
export interface ArticleInput {
  title: string;
  slug: string;
  content: string;
  summary?: string;
  status?: KBStatus;
  categoryId?: number;
  tagIds?: number[];
}

/**
 * Article input for update
 */
export interface ArticleUpdateInput {
  title?: string;
  content?: string;
  summary?: string;
  status?: KBStatus;
  categoryId?: number | null;
  tagIds?: number[];
}

/**
 * Category input for creation
 */
export interface CategoryInput {
  name: KBCategory;
  slug: string;
  description?: string;
  parentId?: number;
}

/**
 * Category input for update
 */
export interface CategoryUpdateInput {
  name?: KBCategory;
  description?: string;
  parentId?: number | null;
}

/**
 * Tag input for creation
 */
export interface TagInput {
  name: string;
  slug: string;
  color?: string;
}

/**
 * Tag input for update
 */
export interface TagUpdateInput {
  name?: string;
  color?: string;
}

/**
 * Rating input
 */
export interface RatingInput {
  rating: number;
  comment?: string;
}

/**
 * Feedback input
 */
export interface FeedbackInput {
  helpful: boolean;
  comment?: string;
}

/**
 * Search filters
 */
export interface SearchFilters {
  query: string;
  categoryIds?: number[];
  tagIds?: number[];
  status?: KBStatus;
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
  status?: KBStatus;
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
