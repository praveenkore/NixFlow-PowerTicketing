/**
 * Knowledge Base Type Definitions for NixFlow Ticketing System
 * 
 * This file contains TypeScript type definitions for Knowledge Base/Self-Service
 * features including articles, categories, tags, ratings, feedback, and search.
 */

/**
 * Knowledge Article Status enumeration matching the Prisma schema
 * Using string literal type to avoid Prisma enum import issues
 */
export type KBStatus = 'Draft' | 'PendingReview' | 'Published' | 'Archived';

/**
 * Knowledge Category enumeration matching the Prisma schema
 * Using string literal type to avoid Prisma enum import issues
 */
export type KBCategory = 'Hardware' | 'Software' | 'Network' | 'Security' | 'Access' | 'General' | 'Troubleshooting' | 'FAQ' | 'Procedures' | 'Policies';

/**
 * Input type for creating a new Knowledge Category
 */
export interface KnowledgeCategoryInput {
  name: KBCategory;
  slug: string;
  description?: string;
  parentId?: number;
}

/**
 * Input type for updating an existing Knowledge Category
 */
export interface KnowledgeCategoryUpdateInput {
  name?: KBCategory;
  description?: string;
  parentId?: number | null;
}

/**
 * Input type for creating a new Knowledge Tag
 */
export interface KnowledgeTagInput {
  name: string;
  slug: string;
  color?: string;
}

/**
 * Input type for updating an existing Knowledge Tag
 */
export interface KnowledgeTagUpdateInput {
  name?: string;
  color?: string;
}

/**
 * Input type for creating a new Knowledge Article
 */
export interface KnowledgeArticleInput {
  title: string;
  slug: string;
  content: string;
  summary?: string;
  status?: KBStatus;
  categoryId?: number;
  authorId: number;
  tagIds?: number[]; // Array of tag IDs to associate with the article
}

/**
 * Input type for updating an existing Knowledge Article
 */
export interface KnowledgeArticleUpdateInput {
  title?: string;
  content?: string;
  summary?: string;
  status?: KBStatus;
  categoryId?: number | null;
  tagIds?: number[]; // Array of tag IDs to associate with the article
}

/**
 * Input type for creating a new Knowledge Article Version
 */
export interface KnowledgeArticleVersionInput {
  articleId: number;
  version: number;
  title: string;
  content: string;
  summary?: string;
  changes?: string;
  createdBy: number;
}

/**
 * Input type for creating a new Knowledge Article Rating
 */
export interface KnowledgeArticleRatingInput {
  articleId: number;
  userId: number;
  rating: number; // 1 to 5
  comment?: string;
}

/**
 * Input type for updating a Knowledge Article Rating
 */
export interface KnowledgeArticleRatingUpdateInput {
  rating?: number;
  comment?: string;
}

/**
 * Input type for creating new Knowledge Article Feedback
 */
export interface KnowledgeArticleFeedbackInput {
  articleId: number;
  userId: number;
  helpful: boolean;
  comment?: string;
}

/**
 * Input type for creating a new Knowledge Article Attachment
 */
export interface KnowledgeArticleAttachmentInput {
  articleId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Input type for knowledge base search
 */
export interface KnowledgeSearchInput {
  query: string;
  categoryIds?: number[];
  tagIds?: number[];
  status?: KBStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'recent' | 'popular' | 'rating';
}

/**
 * Knowledge Base Search Result
 */
export interface KnowledgeSearchResult {
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
  tags: Array<{
    id: number;
    name: string;
    slug: string;
    color: string | null;
  }>;
  viewCount: number;
  rating: number;
  ratingCount: number;
  publishedAt: Date | null;
}

/**
 * Knowledge Article with related data
 */
export interface KnowledgeArticleWithRelations {
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
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
    color: string | null;
  }>;
  versions?: KnowledgeArticleVersionWithRelations[];
  attachments?: KnowledgeArticleAttachmentWithRelations[];
  _count?: {
    versions: number;
    ratings: number;
    views: number;
    feedback: number;
    attachments: number;
  };
}

/**
 * Knowledge Category with related data
 */
export interface KnowledgeCategoryWithRelations {
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
  children?: KnowledgeCategoryWithRelations[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    articles: number;
    children: number;
  };
}

/**
 * Knowledge Tag with related data
 */
export interface KnowledgeTagWithRelations {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    articles: number;
  };
}

/**
 * Knowledge Article Version with related data
 */
export interface KnowledgeArticleVersionWithRelations {
  id: number;
  articleId: number;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  changes: string | null;
  createdBy: number;
  createdAt: Date;
}

/**
 * Knowledge Article Rating with related data
 */
export interface KnowledgeArticleRatingWithRelations {
  id: number;
  articleId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Knowledge Article View with related data
 */
export interface KnowledgeArticleViewWithRelations {
  id: number;
  articleId: number;
  userId: number;
  viewedAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Knowledge Article Feedback with related data
 */
export interface KnowledgeArticleFeedbackWithRelations {
  id: number;
  articleId: number;
  userId: number;
  helpful: boolean;
  comment: string | null;
  createdAt: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Knowledge Article Attachment with related data
 */
export interface KnowledgeArticleAttachmentWithRelations {
  id: number;
  articleId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Knowledge Analytics data structure
 */
export interface KnowledgeAnalytics {
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
    timestamp: Date;
  }>;
}

/**
 * Knowledge Popular Article data structure
 */
export interface KnowledgePopularArticle {
  articleId: number;
  title: string;
  slug: string;
  viewCount: number;
  rating: number;
  ratingCount: number;
  category?: {
    id: number;
    name: KBCategory;
    slug: string;
  };
  publishedAt: Date | null;
}

/**
 * Knowledge Search Suggestion data structure
 */
export interface KnowledgeSearchSuggestion {
  type: 'article' | 'category' | 'tag';
  id: number;
  title: string;
  slug?: string;
  category?: KBCategory;
  relevanceScore: number;
}

/**
 * Knowledge Article Statistics
 */
export interface KnowledgeArticleStatistics {
  articleId: number;
  totalViews: number;
  uniqueViews: number;
  totalRatings: number;
  averageRating: number;
  totalFeedback: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number;
  lastViewedAt: Date | null;
  lastRatedAt: Date | null;
  lastFeedbackAt: Date | null;
}

/**
 * Knowledge Related Articles result
 */
export interface KnowledgeRelatedArticles {
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
 * Knowledge Article Approval Workflow Data
 */
export interface KnowledgeArticleApprovalData {
  articleId: number;
  currentStatus: KBStatus;
  requestedStatus: KBStatus;
  reviewerId: number;
  reviewerComments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

/**
 * Knowledge Article Diff result
 */
export interface KnowledgeArticleDiff {
  articleId: number;
  versionFrom: number;
  versionTo: number;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  summary: string;
}

/**
 * Knowledge Bulk Operation Result
 */
export interface KnowledgeBulkOperationResult {
  success: boolean;
  operation: 'publish' | 'archive' | 'delete' | 'update_category' | 'update_tags';
  affectedCount: number;
  errors: Array<{
    articleId: number;
    articleTitle: string;
    error: string;
  }>;
}

/**
 * Knowledge Export Options
 */
export interface KnowledgeExportOptions {
  format: 'pdf' | 'html' | 'markdown' | 'json';
  includeVersions?: boolean;
  includeAttachments?: boolean;
  includeRatings?: boolean;
  articleIds?: number[];
  categoryIds?: number[];
}

/**
 * Knowledge Import Options
 */
export interface KnowledgeImportOptions {
  format: 'json' | 'markdown';
  overwriteExisting?: boolean;
  createCategories?: boolean;
  createTags?: boolean;
  importAsDraft?: boolean;
  authorId: number;
}
