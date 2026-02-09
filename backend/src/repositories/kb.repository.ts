/**
 * Knowledge Base Repository - Database operations for KB entities
 * 
 * This repository handles all database operations for Knowledge Base entities including
 * Knowledge Categories, Knowledge Tags, Knowledge Articles, Article Versions, Ratings,
 * Feedback, Views, Attachments, and Search History using Prisma ORM.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KBRepository {
  // ==================== Knowledge Category Methods ====================

  /**
   * Create a new Knowledge Category
   */
  async createCategory(data: any): Promise<any> {
    return await prisma.knowledgeCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { articles: true, children: true },
        },
      },
    });
  }

  /**
   * Update an existing Knowledge Category
   */
  async updateCategory(id: number, data: any): Promise<any> {
    return await prisma.knowledgeCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { articles: true, children: true },
        },
      },
    });
  }

  /**
   * Delete a Knowledge Category
   */
  async deleteCategory(id: number): Promise<void> {
    await prisma.knowledgeCategory.delete({
      where: { id },
    });
  }

  /**
   * Get Knowledge Categories with pagination and filters
   */
  async getCategories(filters: {
    parentId?: number | null;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeCategory.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { articles: true, children: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.knowledgeCategory.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get a specific Knowledge Category by ID
   */
  async getCategoryById(id: number): Promise<any | null> {
    return await prisma.knowledgeCategory.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          include: {
            _count: {
              select: { articles: true },
            },
          },
        },
        _count: {
          select: { articles: true, children: true },
        },
      },
    });
  }

  /**
   * Get a specific Knowledge Category by slug
   */
  async getCategoryBySlug(slug: string): Promise<any | null> {
    return await prisma.knowledgeCategory.findUnique({
      where: { slug },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          include: {
            _count: {
              select: { articles: true },
            },
          },
        },
        _count: {
          select: { articles: true, children: true },
        },
      },
    });
  }

  // ==================== Knowledge Tag Methods ====================

  /**
   * Create a new Knowledge Tag
   */
  async createTag(data: any): Promise<any> {
    return await prisma.knowledgeTag.create({
      data: {
        name: data.name,
        slug: data.slug,
        color: data.color,
      },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  /**
   * Update an existing Knowledge Tag
   */
  async updateTag(id: number, data: any): Promise<any> {
    return await prisma.knowledgeTag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  /**
   * Delete a Knowledge Tag
   */
  async deleteTag(id: number): Promise<void> {
    await prisma.knowledgeTag.delete({
      where: { id },
    });
  }

  /**
   * Get Knowledge Tags with pagination
   */
  async getTags(filters: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.knowledgeTag.findMany({
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { articles: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.knowledgeTag.count(),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get a specific Knowledge Tag by ID
   */
  async getTagById(id: number): Promise<any | null> {
    return await prisma.knowledgeTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  /**
   * Get a specific Knowledge Tag by slug
   */
  async getTagBySlug(slug: string): Promise<any | null> {
    return await prisma.knowledgeTag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  // ==================== Knowledge Article Methods ====================

  /**
   * Create a new Knowledge Article
   */
  async createArticle(data: any): Promise<any> {
    return await prisma.knowledgeArticle.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        summary: data.summary,
        status: data.status ?? 'Draft',
        categoryId: data.categoryId,
        authorId: data.authorId,
        tags: data.tagIds
          ? {
              connect: data.tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, description: true },
        },
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        tags: true,
        _count: {
          select: { versions: true, ratings: true, views: true, feedback: true, attachments: true },
        },
      },
    });
  }

  /**
   * Update an existing Knowledge Article
   */
  async updateArticle(id: number, data: any): Promise<any> {
    return await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.tagIds !== undefined && {
          tags: {
            set: data.tagIds.map((tagId) => ({ id: tagId })),
          },
        }),
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, description: true },
        },
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        tags: true,
        _count: {
          select: { versions: true, ratings: true, views: true, feedback: true, attachments: true },
        },
      },
    });
  }

  /**
   * Delete a Knowledge Article
   */
  async deleteArticle(id: number): Promise<void> {
    await prisma.knowledgeArticle.delete({
      where: { id },
    });
  }

  /**
   * Get Knowledge Articles with pagination and filters
   */
  async getArticles(filters: {
    categoryId?: number;
    tagId?: number;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'recent' | 'popular' | 'rating' | 'title';
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
    }
    if (filters.tagId !== undefined) {
      where.tags = {
        some: { id: filters.tagId },
      };
    }
    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (filters.sortBy === 'popular') {
      orderBy = { viewCount: 'desc' };
    } else if (filters.sortBy === 'rating') {
      orderBy = [{ rating: 'desc' }, { ratingCount: 'desc' }];
    } else if (filters.sortBy === 'title') {
      orderBy = { title: 'asc' };
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          category: {
            select: { id: true, name: true, slug: true, description: true },
          },
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          tags: true,
          _count: {
            select: { versions: true, ratings: true, views: true, feedback: true, attachments: true },
          },
        },
        orderBy,
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get a specific Knowledge Article by ID
   */
  async getArticleById(id: number): Promise<any | null> {
    return await prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, description: true },
        },
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        tags: true,
        versions: {
          orderBy: { version: 'desc' },
        },
        attachments: true,
        _count: {
          select: { versions: true, ratings: true, views: true, feedback: true, attachments: true },
        },
      },
    });
  }

  /**
   * Get a specific Knowledge Article by slug
   */
  async getArticleBySlug(slug: string): Promise<any | null> {
    return await prisma.knowledgeArticle.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, name: true, slug: true, description: true },
        },
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        tags: true,
        versions: {
          orderBy: { version: 'desc' },
        },
        attachments: true,
        _count: {
          select: { versions: true, ratings: true, views: true, feedback: true, attachments: true },
        },
      },
    });
  }

  /**
   * Get Knowledge Articles by Category
   */
  async getArticlesByCategory(categoryId: number, filters: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    return await this.getArticles({
      categoryId,
      status: filters.status,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  /**
   * Get Knowledge Articles by Tag
   */
  async getArticlesByTag(tagId: number, filters: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    return await this.getArticles({
      tagId,
      status: filters.status,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  /**
   * Search Knowledge Articles with relevance scoring
   */
  async searchArticles(filters: {
    query: string;
    categoryIds?: number[];
    tagIds?: number[];
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'relevance' | 'recent' | 'popular' | 'rating';
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: filters.status ?? 'Published',
    };

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      where.categoryId = { in: filters.categoryIds };
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      where.tags = {
        some: { id: { in: filters.tagIds } },
      };
    }

    // Search in title and content
    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { content: { contains: filters.query, mode: 'insensitive' } },
        { summary: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (filters.sortBy === 'popular') {
      orderBy = { viewCount: 'desc' };
    } else if (filters.sortBy === 'rating') {
      orderBy = [{ rating: 'desc' }, { ratingCount: 'desc' }];
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          tags: true,
        },
        orderBy,
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);

    // Calculate relevance scores
    const searchResults = items.map((article: any) => {
      let relevanceScore = 0;
      const queryLower = filters.query.toLowerCase();

      // Title match (highest weight)
      if (article.title.toLowerCase().includes(queryLower)) {
        relevanceScore += 100;
      }

      // Content match (medium weight)
      if (article.content.toLowerCase().includes(queryLower)) {
        relevanceScore += 50;
      }

      // Summary match (medium weight)
      if (article.summary?.toLowerCase().includes(queryLower)) {
        relevanceScore += 40;
      }

      // Tag match (bonus)
      const tagMatch = article.tags.some((tag: any) => tag.name.toLowerCase().includes(queryLower));
      if (tagMatch) {
        relevanceScore += 30;
      }

      // Category match (bonus)
      if (article.category?.name.toLowerCase().includes(queryLower)) {
        relevanceScore += 20;
      }

      // Views bonus (popularity)
      relevanceScore += Math.min(article.viewCount / 10, 20);

      // Rating bonus
      relevanceScore += article.rating * 2;

      return {
        articleId: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        relevanceScore,
        category: article.category
          ? {
              id: article.category.id,
              name: article.category.name,
              slug: article.category.slug,
            }
          : undefined,
        tags: article.tags.map((tag: any) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
        })),
        viewCount: article.viewCount,
        rating: article.rating,
        ratingCount: article.ratingCount,
        publishedAt: article.publishedAt,
      };
    });

    // Sort by relevance if requested
    if (filters.sortBy === 'relevance') {
      searchResults.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    }

    return { items: searchResults, total, page, pageSize };
  }

  /**
   * Get Popular Articles
   */
  async getPopularArticles(limit: number = 10): Promise<any[]> {
    const articles = await prisma.knowledgeArticle.findMany({
      where: { status: 'Published' },
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: true,
      },
      orderBy: [
        { viewCount: 'desc' },
        { rating: 'desc' },
        { ratingCount: 'desc' },
      ],
    });

    return articles.map((article: any) => ({
      articleId: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      relevanceScore: article.viewCount + article.rating * 10,
      category: article.category
        ? {
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
          }
        : undefined,
      tags: article.tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
      })),
      viewCount: article.viewCount,
      rating: article.rating,
      ratingCount: article.ratingCount,
      publishedAt: article.publishedAt,
    }));
  }

  /**
   * Get Related Articles based on tags and category
   */
  async getRelatedArticles(articleId: number, limit: number = 5): Promise<any[]> {
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: true,
      },
    });

    if (!article) {
      return [];
    }

    const tagIds = article.tags.map((tag: any) => tag.id);
    const categoryId = article.categoryId;

    // Find articles with matching tags or category
    const relatedArticles = await prisma.knowledgeArticle.findMany({
      where: {
        id: { not: articleId },
        status: 'Published',
        OR: [
          { categoryId },
          { tags: { some: { id: { in: tagIds } } } },
        ],
      },
      take: limit * 2, // Get more to calculate relevance
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: true,
      },
    });

    // Calculate relevance scores
    const scoredArticles = relatedArticles.map((related: any) => {
      let relevanceScore = 0;

      // Same category (medium weight)
      if (related.categoryId === categoryId) {
        relevanceScore += 50;
      }

      // Matching tags (high weight per tag)
      const matchingTags = related.tags.filter((tag: any) => tagIds.includes(tag.id));
      relevanceScore += matchingTags.length * 30;

      // Views bonus
      relevanceScore += Math.min(related.viewCount / 10, 20);

      // Rating bonus
      relevanceScore += related.rating * 2;

      return {
        articleId: related.id,
        title: related.title,
        slug: related.slug,
        summary: related.summary,
        relevanceScore,
        category: related.category
          ? {
              id: related.category.id,
              name: related.category.name,
              slug: related.category.slug,
            }
          : undefined,
        tags: related.tags.map((tag: any) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
        })),
        viewCount: related.viewCount,
        rating: related.rating,
        ratingCount: related.ratingCount,
        publishedAt: related.publishedAt,
      };
    });

    // Sort by relevance and limit
    scoredArticles.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    return scoredArticles.slice(0, limit);
  }

  // ==================== Knowledge Article Version Methods ====================

  /**
   * Create a new Knowledge Article Version
   */
  async createVersion(data: any): Promise<any> {
    return await prisma.knowledgeArticleVersion.create({
      data: {
        articleId: data.articleId,
        version: data.version,
        title: data.title,
        content: data.content,
        summary: data.summary,
        changes: data.changes,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Get versions for an article
   */
  async getVersions(articleId: number): Promise<any[]> {
    return await prisma.knowledgeArticleVersion.findMany({
      where: { articleId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Get a specific version by ID
   */
  async getVersionById(versionId: number): Promise<any | null> {
    return await prisma.knowledgeArticleVersion.findUnique({
      where: { id: versionId },
    });
  }

  /**
   * Compare two versions
   */
  async compareVersions(versionId1: number, versionId2: number): Promise<{
    version1: any | null;
    version2: any | null;
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersionById(versionId1),
      this.getVersionById(versionId2),
    ]);

    return { version1, version2 };
  }

  // ==================== Knowledge Article Rating Methods ====================

  /**
   * Create a new Knowledge Article Rating
   */
  async createRating(data: any): Promise<any> {
    return await prisma.knowledgeArticleRating.create({
      data: {
        articleId: data.articleId,
        userId: data.userId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Update an existing Knowledge Article Rating
   */
  async updateRating(id: number, data: any): Promise<any> {
    return await prisma.knowledgeArticleRating.update({
      where: { id },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.comment !== undefined && { comment: data.comment }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Delete a Knowledge Article Rating
   */
  async deleteRating(id: number): Promise<void> {
    await prisma.knowledgeArticleRating.delete({
      where: { id },
    });
  }

  /**
   * Get ratings for an article
   */
  async getRatings(articleId: number, filters: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.knowledgeArticleRating.findMany({
        where: { articleId },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.knowledgeArticleRating.count({ where: { articleId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get a user's rating for an article
   */
  async getUserRating(articleId: number, userId: number): Promise<any | null> {
    return await prisma.knowledgeArticleRating.findUnique({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get average rating for an article
   */
  async getAverageRating(articleId: number): Promise<{ averageRating: number; ratingCount: number }> {
    const ratings = await prisma.knowledgeArticleRating.findMany({
      where: { articleId },
      select: { rating: true },
    });

    const ratingCount = ratings.length;
    const averageRating = ratingCount > 0
      ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingCount
      : 0;

    return { averageRating, ratingCount };
  }

  // ==================== Knowledge Article Feedback Methods ====================

  /**
   * Create new Knowledge Article Feedback
   */
  async createFeedback(data: any): Promise<any> {
    return await prisma.knowledgeArticleFeedback.create({
      data: {
        articleId: data.articleId,
        userId: data.userId,
        helpful: data.helpful,
        comment: data.comment,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get feedback for an article
   */
  async getFeedback(articleId: number, filters: {
    helpful?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: any = { articleId };
    if (filters.helpful !== undefined) {
      where.helpful = filters.helpful;
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeArticleFeedback.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.knowledgeArticleFeedback.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get feedback statistics for an article
   */
  async getFeedbackStats(articleId: number): Promise<{
    totalFeedback: number;
    helpfulCount: number;
    notHelpfulCount: number;
    helpfulPercentage: number;
  }> {
    const feedback = await prisma.knowledgeArticleFeedback.findMany({
      where: { articleId },
      select: { helpful: true },
    });

    const totalFeedback = feedback.length;
    const helpfulCount = feedback.filter((f: any) => f.helpful).length;
    const notHelpfulCount = totalFeedback - helpfulCount;
    const helpfulPercentage = totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0;

    return { totalFeedback, helpfulCount, notHelpfulCount, helpfulPercentage };
  }

  // ==================== Knowledge Article View Methods ====================

  /**
   * Create a new Knowledge Article View
   */
  async createView(articleId: number, userId: number): Promise<any> {
    return await prisma.knowledgeArticleView.create({
      data: {
        articleId,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Get views for an article
   */
  async getViews(articleId: number, filters: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.knowledgeArticleView.findMany({
        where: { articleId },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { viewedAt: 'desc' },
      }),
      prisma.knowledgeArticleView.count({ where: { articleId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get view count for an article
   */
  async getViewCount(articleId: number): Promise<{ totalViews: number; uniqueViews: number }> {
    const views = await prisma.knowledgeArticleView.findMany({
      where: { articleId },
      select: { userId: true },
    });

    const totalViews = views.length;
    const uniqueUsers = new Set(views.map((v: any) => v.userId));
    const uniqueViews = uniqueUsers.size;

    return { totalViews, uniqueViews };
  }

  // ==================== Knowledge Article Attachment Methods ====================

  /**
   * Create a new Knowledge Article Attachment
   */
  async createAttachment(data: any): Promise<any> {
    return await prisma.knowledgeArticleAttachment.create({
      data: {
        articleId: data.articleId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      },
    });
  }

  /**
   * Delete a Knowledge Article Attachment
   */
  async deleteAttachment(id: number): Promise<void> {
    await prisma.knowledgeArticleAttachment.delete({
      where: { id },
    });
  }

  /**
   * Get attachments for an article
   */
  async getAttachments(articleId: number): Promise<any[]> {
    return await prisma.knowledgeArticleAttachment.findMany({
      where: { articleId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Get a specific attachment by ID
   */
  async getAttachmentById(id: number): Promise<any | null> {
    return await prisma.knowledgeArticleAttachment.findUnique({
      where: { id },
    });
  }

  // ==================== Knowledge Search History Methods ====================

  /**
   * Create a new search history entry
   */
  async createSearchHistory(userId: number, query: string): Promise<any> {
    return await prisma.knowledgeSearchHistory.create({
      data: {
        userId,
        query,
        resultsCount: 0,
      },
    });
  }

  /**
   * Get search history for a user
   */
  async getSearchHistory(userId: number, filters: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.knowledgeSearchHistory.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { searchedAt: 'desc' },
      }),
      prisma.knowledgeSearchHistory.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10): Promise<{ query: string; count: number }[]> {
    const searches = await prisma.knowledgeSearchHistory.groupBy({
      by: ['query'],
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    return searches.map((s: any) => ({ query: s.query, count: s._count.query }));
  }

  // ==================== Knowledge Analytics Methods ====================

  /**
   * Get Knowledge Base Analytics
   */
  async getAnalytics(): Promise<any> {
    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingReviewArticles,
      archivedArticles,
      totalViews,
      totalRatings,
      totalFeedback,
      topCategories,
      popularTags,
      recentActivity,
    ] = await Promise.all([
      prisma.knowledgeArticle.count(),
      prisma.knowledgeArticle.count({ where: { status: 'Published' } }),
      prisma.knowledgeArticle.count({ where: { status: 'Draft' } }),
      prisma.knowledgeArticle.count({ where: { status: 'PendingReview' } }),
      prisma.knowledgeArticle.count({ where: { status: 'Archived' } }),
      prisma.knowledgeArticleView.count(),
      prisma.knowledgeArticleRating.count(),
      prisma.knowledgeArticleFeedback.count(),
      this.getTopCategories(5),
      this.getPopularTags(10),
      this.getRecentActivity(10),
    ]);

    // Calculate average rating
    const ratingStats = await prisma.knowledgeArticleRating.aggregate({
      _avg: { rating: true },
    });

    const averageRating = ratingStats._avg.rating || 0;

    // Calculate helpful percentage
    const helpfulFeedback = await prisma.knowledgeArticleFeedback.count({
      where: { helpful: true },
    });
    const helpfulPercentage = totalFeedback > 0 ? (helpfulFeedback / totalFeedback) * 100 : 0;

    return {
      totalArticles,
      publishedArticles,
      draftArticles,
      pendingReviewArticles,
      archivedArticles,
      totalViews,
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedback,
      helpfulPercentage: Math.round(helpfulPercentage * 10) / 10,
      topCategories,
      popularTags,
      recentActivity,
    };
  }

  /**
   * Get Top Categories by article count
   */
  async getTopCategories(limit: number = 5): Promise<any[]> {
    const categories = await prisma.knowledgeCategory.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: {
        articles: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return categories.map((cat: any) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      articleCount: cat._count.articles,
      viewCount: 0, // Would need aggregation to calculate
    }));
  }

  /**
   * Get Popular Tags by article count
   */
  async getPopularTags(limit: number = 10): Promise<any[]> {
    const tags = await prisma.knowledgeTag.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: {
        articles: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return tags.map((tag: any) => ({
      tagId: tag.id,
      tagName: tag.name,
      articleCount: tag._count.articles,
    }));
  }

  /**
   * Get Recent Activity
   */
  async getRecentActivity(limit: number = 10): Promise<any[]> {
    // Get recent article creations
    const recentArticles = await prisma.knowledgeArticle.findMany({
      where: { status: 'Published' },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return recentArticles.map((article: any) => ({
      type: 'article_published',
      articleId: article.id,
      articleTitle: article.title,
      userId: article.authorId,
      userName: article.author.name,
      timestamp: article.publishedAt || article.createdAt,
    }));
  }

  /**
   * Get Article Statistics
   */
  async getArticleStatistics(articleId: number): Promise<any> {
    const [totalViews, uniqueViews, totalRatings, totalFeedback, helpfulFeedback, lastViewed, lastRated, lastFeedback] =
      await Promise.all([
        prisma.knowledgeArticleView.count({ where: { articleId } }),
        prisma.knowledgeArticleView
          .groupBy({
            by: ['userId'],
            where: { articleId },
          })
          .then((result) => result.length),
        prisma.knowledgeArticleRating.count({ where: { articleId } }),
        prisma.knowledgeArticleFeedback.count({ where: { articleId } }),
        prisma.knowledgeArticleFeedback.count({ where: { articleId, helpful: true } }),
        prisma.knowledgeArticleView.findFirst({
          where: { articleId },
          orderBy: { viewedAt: 'desc' },
          select: { viewedAt: true },
        }),
        prisma.knowledgeArticleRating.findFirst({
          where: { articleId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        prisma.knowledgeArticleFeedback.findFirst({
          where: { articleId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

    const ratingStats = await prisma.knowledgeArticleRating.aggregate({
      where: { articleId },
      _avg: { rating: true },
    });

    const averageRating = ratingStats._avg.rating || 0;
    const helpfulCount = helpfulFeedback;
    const notHelpfulCount = totalFeedback - helpfulFeedback;
    const helpfulPercentage = totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0;

    return {
      articleId,
      totalViews,
      uniqueViews,
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedback,
      helpfulCount,
      notHelpfulCount,
      helpfulPercentage: Math.round(helpfulPercentage * 10) / 10,
      lastViewedAt: lastViewed?.viewedAt || null,
      lastRatedAt: lastRated?.createdAt || null,
      lastFeedbackAt: lastFeedback?.createdAt || null,
    };
  }

  /**
   * Get Category Tree (hierarchical)
   */
  async getCategoryTree(): Promise<any[]> {
    const categories = await prisma.knowledgeCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
        _count: {
          select: { articles: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  /**
   * Get Article Rating by User
   */
  async getArticleRatingByUser(articleId: number, userId: number): Promise<any | null> {
    return await prisma.knowledgeArticleRating.findUnique({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
    });
  }

  /**
   * Get Article Feedback by User
   */
  async getArticleFeedbackByUser(articleId: number, userId: number): Promise<any | null> {
    return await prisma.knowledgeArticleFeedback.findFirst({
      where: {
        articleId,
        userId,
      },
    });
  }

  /**
   * Get Article Version by version number
   */
  async getArticleVersion(articleId: number, version: number): Promise<any | null> {
    return await prisma.knowledgeArticleVersion.findFirst({
      where: {
        articleId,
        version,
      },
    });
  }

  /**
   * Get Article Ratings (alias for getRatings)
   */
  async getArticleRatings(articleId: number): Promise<any[]> {
    const result = await this.getRatings(articleId, { page: 1, pageSize: 1000 });
    return result.items;
  }

  /**
   * Get Article Versions (alias for getVersions)
   */
  async getArticleVersions(articleId: number): Promise<any[]> {
    return await this.getVersions(articleId);
  }

  /**
   * Create Article Version (alias for createVersion)
   */
  async createArticleVersion(data: any): Promise<any> {
    return await this.createVersion(data);
  }

  /**
   * Create Article Rating (alias for createRating)
   */
  async createArticleRating(data: any): Promise<any> {
    return await this.createRating(data);
  }

  /**
   * Update Article Rating (alias for updateRating)
   */
  async updateArticleRating(id: number, data: any): Promise<any> {
    return await this.updateRating(id, data);
  }

  /**
   * Create Article View (alias for createView)
   */
  async createArticleView(data: any): Promise<any> {
    return await this.createView(data.articleId, data.userId);
  }

  /**
   * Create Article Feedback (alias for createFeedback)
   */
  async createArticleFeedback(data: any): Promise<any> {
    return await this.createFeedback(data);
  }

  /**
   * Get Related Articles (alias for getRelatedArticles)
   */
  async getRelatedArticlesWrapper(articleId: number): Promise<any> {
    const related = await this.getRelatedArticles(articleId, 5);
    return {
      articleId,
      relatedArticles: related,
    };
  }
}

export default new KBRepository();
