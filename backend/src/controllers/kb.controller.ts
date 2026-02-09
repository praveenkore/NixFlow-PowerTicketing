/**
 * Knowledge Base Controller - REST API endpoints for KB operations
 * 
 * This controller handles all HTTP requests for Knowledge Base entities including
 * Articles, Categories, Tags, Ratings, Feedback, Views, and Search.
 * 
 * All endpoints require authentication and emit events to the event bus.
 */

import { Request, Response, Router } from 'express';
import { KBRepository } from '../repositories/kb.repository';
import { EventBus } from '../events/event-bus';
import {
  KBEventType,
  ArticleCreatedEventData,
  ArticlePublishedEventData,
  ArticleViewedEventData,
  ArticleRatedEventData,
} from '../events/event-types';

const kbRepository = new KBRepository();

/**
 * Create Express router for KB endpoints
 */
const router = Router();

/**
 * Middleware to attach event bus to requests
 */
declare global {
  namespace Express {
    interface Request {
      eventBus?: EventBus;
      user?: { id: number; name: string; email: string; role: string };
    }
  }
}

// ==================== Article Endpoints ====================

/**
 * KB-API-02: GET /api/kb/articles - List articles with pagination & filters
 * @query categoryId - Filter by category ID
 * @query tagId - Filter by tag ID
 * @query status - Filter by status (Draft, PendingReview, Published, Archived)
 * @query page - Page number (default: 1)
 * @query pageSize - Items per page (default: 20)
 * @query sortBy - Sort order (recent, popular, rating, title)
 */
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const tagId = req.query.tagId ? Number(req.query.tagId) : undefined;
    const status = req.query.status as string | undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const sortBy = req.query.sortBy as 'recent' | 'popular' | 'rating' | 'title' | undefined;

    const result = await kbRepository.getArticles({
      categoryId,
      tagId,
      status,
      page,
      pageSize,
      sortBy,
    });

    res.json({
      articles: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  }
});

/**
 * KB-API-03: GET /api/kb/articles/:id - Get single article by ID
 */
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const article = await kbRepository.getArticleById(articleId);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch article' });
  }
});

/**
 * KB-API-04: POST /api/kb/articles - Create new article
 * Emits ARTICLE_CREATED event
 */
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const { title, slug, content, summary, status, categoryId, tagIds } = req.body;
    const authorId = req.user!.id;

    // Validate required fields
    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Title, slug, and content are required' });
    }

    // Create article
    const article = await kbRepository.createArticle({
      title,
      slug,
      content,
      summary,
      status: status || 'Draft',
      categoryId: categoryId ? Number(categoryId) : undefined,
      authorId,
      tagIds: tagIds ? tagIds.map((id: string) => Number(id)) : undefined,
    });

    // Emit ARTICLE_CREATED event
    if (req.eventBus) {
      await req.eventBus.emit(
        KBEventType.ARTICLE_CREATED,
        {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          authorId: article.authorId,
          categoryId: article.categoryId || 0,
          status: article.status,
        } as ArticleCreatedEventData,
        {
          userId: req.user!.id,
          source: 'backend',
        }
      );
    }

    res.status(201).json(article);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create article' });
  }
});

/**
 * KB-API-05: PUT /api/kb/articles/:id - Update article
 * Emits ARTICLE_UPDATED event and creates new version
 */
router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const { title, content, summary, status, categoryId, tagIds } = req.body;

    // Get existing article for version tracking
    const existingArticle = await kbRepository.getArticleById(articleId);
    if (!existingArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update article
    const updatedArticle = await kbRepository.updateArticle(articleId, {
      title,
      content,
      summary,
      status,
      categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined,
      tagIds: tagIds ? tagIds.map((id: string) => Number(id)) : undefined,
    });

    // Create version if content changed
    if (content && content !== existingArticle.content) {
      const versionNumber = (existingArticle._count?.versions || 0) + 1;
      await kbRepository.createArticleVersion({
        articleId,
        version: versionNumber,
        title: updatedArticle.title,
        content: updatedArticle.content,
        summary: updatedArticle.summary,
        changes: `Updated by ${req.user!.name}`,
        createdBy: req.user!.id,
      });
    }

    // Emit ARTICLE_UPDATED event
    if (req.eventBus && status === 'Published' && existingArticle.status !== 'Published') {
      await req.eventBus.emit(
        KBEventType.ARTICLE_PUBLISHED,
        {
          articleId: updatedArticle.id,
          title: updatedArticle.title,
          slug: updatedArticle.slug,
          publishedBy: req.user!.id,
          version: existingArticle._count?.versions || 1,
        } as ArticlePublishedEventData,
        {
          userId: req.user!.id,
          source: 'backend',
        }
      );
    }

    res.json(updatedArticle);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update article' });
  }
});

/**
 * KB-API-06: DELETE /api/kb/articles/:id - Soft delete (archive) article
 * Emits ARTICLE_ARCHIVED event
 */
router.delete('/articles/:id', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);

    // Check if article exists
    const article = await kbRepository.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Soft delete by archiving
    await kbRepository.updateArticle(articleId, { status: 'Archived' });

    // Emit ARTICLE_ARCHIVED event
    if (req.eventBus) {
      await req.eventBus.emit(
        KBEventType.ARTICLE_ARCHIVED,
        {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          archivedBy: req.user!.id,
        },
        {
          userId: req.user!.id,
          source: 'backend',
        }
      );
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to archive article' });
  }
});

/**
 * KB-API-09: GET /api/kb/search - Search articles with relevance scoring
 * @query query - Search query string
 * @query categoryIds - Comma-separated category IDs
 * @query tagIds - Comma-separated tag IDs
 * @query status - Filter by status
 * @query page - Page number
 * @query pageSize - Items per page
 * @query sortBy - Sort order (relevance, recent, popular, rating)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const categoryIds = req.query.categoryIds
      ? (req.query.categoryIds as string).split(',').map(Number)
      : undefined;
    const tagIds = req.query.tagIds
      ? (req.query.tagIds as string).split(',').map(Number)
      : undefined;
    const status = req.query.status as string | undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
    const sortBy = req.query.sortBy as 'relevance' | 'recent' | 'popular' | 'rating' | undefined;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await kbRepository.searchArticles({
      query: query.trim(),
      categoryIds,
      tagIds,
      status,
      page,
      pageSize,
      sortBy,
    });

    res.json({
      results: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

/**
 * KB-API-10: POST /api/kb/articles/:id/rate - Rate an article
 * Emits ARTICLE_RATED event
 */
router.post('/articles/:id/rate', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const { rating, comment } = req.body;
    const userId = req.user!.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if article exists
    const article = await kbRepository.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Check if user already rated
    const existingRating = await kbRepository.getArticleRatingByUser(articleId, userId);
    if (existingRating) {
      // Update existing rating
      await kbRepository.updateArticleRating(existingRating.id, { rating, comment });
    } else {
      // Create new rating
      await kbRepository.createArticleRating({
        articleId,
        userId,
        rating,
        comment,
      });
    }

    // Recalculate article rating average
    const ratings = await kbRepository.getArticleRatings(articleId);
    const averageRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await kbRepository.updateArticle(articleId, {
      rating: Math.round(averageRating * 10) / 10,
      ratingCount: ratings.length,
    });

    // Emit ARTICLE_RATED event
    if (req.eventBus) {
      await req.eventBus.emit(
        KBEventType.ARTICLE_RATED,
        {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          ratedBy: userId,
          rating,
          comment,
        } as ArticleRatedEventData,
        {
          userId: req.user!.id,
          source: 'backend',
        }
      );
    }

    res.json({ averageRating: Math.round(averageRating * 10) / 10, ratingCount: ratings.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to rate article' });
  }
});

/**
 * KB-API-11: POST /api/kb/articles/:id/view - Record article view
 * Emits ARTICLE_VIEWED event
 */
router.post('/articles/:id/view', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const userId = req.user!.id;

    // Check if article exists
    const article = await kbRepository.getArticleById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Record view
    await kbRepository.createArticleView({
      articleId,
      userId,
    });

    // Update view count
    await kbRepository.updateArticle(articleId, {
      viewCount: article.viewCount + 1,
    });

    // Emit ARTICLE_VIEWED event
    if (req.eventBus) {
      await req.eventBus.emit(
        KBEventType.ARTICLE_VIEWED,
        {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          viewedBy: userId,
        } as ArticleViewedEventData,
        {
          userId: req.user!.id,
          source: 'backend',
        }
      );
    }

    res.json({ viewCount: article.viewCount + 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record view' });
  }
});

// ==================== Category Endpoints ====================

/**
 * KB-API-07: GET /api/kb/categories - List categories with article counts
 * @query parentId - Filter by parent category ID
 * @query page - Page number
 * @query pageSize - Items per page
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const parentId = req.query.parentId ? (req.query.parentId === 'null' ? null : Number(req.query.parentId)) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;

    const result = await kbRepository.getCategories({
      parentId,
      page,
      pageSize,
    });

    res.json({
      categories: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

/**
 * GET /api/kb/categories/tree - Get hierarchical category tree
 */
router.get('/categories/tree', async (req: Request, res: Response) => {
  try {
    const tree = await kbRepository.getCategoryTree();
    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch category tree' });
  }
});

/**
 * GET /api/kb/categories/:id - Get single category by ID
 */
router.get('/categories/:id', async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);
    const category = await kbRepository.getCategoryById(categoryId);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch category' });
  }
});

/**
 * POST /api/kb/categories - Create new category
 */
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, parentId } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const category = await kbRepository.createCategory({
      name,
      slug,
      description,
      parentId: parentId ? Number(parentId) : undefined,
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
});

/**
 * PUT /api/kb/categories/:id - Update category
 */
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);
    const { name, description, parentId } = req.body;

    const category = await kbRepository.updateCategory(categoryId, {
      name,
      description,
      parentId: parentId !== undefined ? (parentId ? Number(parentId) : null) : undefined,
    });

    res.json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update category' });
  }
});

/**
 * DELETE /api/kb/categories/:id - Delete category
 */
router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.params.id);
    await kbRepository.deleteCategory(categoryId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete category' });
  }
});

// ==================== Tag Endpoints ====================

/**
 * KB-API-08: GET /api/kb/tags - List tags with usage counts
 * @query page - Page number
 * @query pageSize - Items per page
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;

    const result = await kbRepository.getTags({
      page,
      pageSize,
    });

    res.json({
      tags: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch tags' });
  }
});

/**
 * GET /api/kb/tags/popular - Get popular tags (sorted by article count)
 */
router.get('/tags/popular', async (req: Request, res: Response) => {
  try {
    const result = await kbRepository.getPopularTags();
    res.json({ tags: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch popular tags' });
  }
});

/**
 * GET /api/kb/tags/:id - Get single tag by ID
 */
router.get('/tags/:id', async (req: Request, res: Response) => {
  try {
    const tagId = Number(req.params.id);
    const tag = await kbRepository.getTagById(tagId);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch tag' });
  }
});

/**
 * POST /api/kb/tags - Create new tag
 */
router.post('/tags', async (req: Request, res: Response) => {
  try {
    const { name, slug, color } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const tag = await kbRepository.createTag({
      name,
      slug,
      color,
    });

    res.status(201).json(tag);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create tag' });
  }
});

/**
 * PUT /api/kb/tags/:id - Update tag
 */
router.put('/tags/:id', async (req: Request, res: Response) => {
  try {
    const tagId = Number(req.params.id);
    const { name, color } = req.body;

    const tag = await kbRepository.updateTag(tagId, {
      name,
      color,
    });

    res.json(tag);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update tag' });
  }
});

/**
 * DELETE /api/kb/tags/:id - Delete tag
 */
router.delete('/tags/:id', async (req: Request, res: Response) => {
  try {
    const tagId = Number(req.params.id);
    await kbRepository.deleteTag(tagId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete tag' });
  }
});

// ==================== Analytics Endpoints ====================

/**
 * KB-API-12: GET /api/kb/analytics - Get analytics dashboard data
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await kbRepository.getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/kb/articles/:id/statistics - Get article statistics
 */
router.get('/articles/:id/statistics', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const statistics = await kbRepository.getArticleStatistics(articleId);
    res.json(statistics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/kb/articles/:id/related - Get related articles
 */
router.get('/articles/:id/related', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const related = await kbRepository.getRelatedArticlesWrapper(articleId);
    res.json(related);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch related articles' });
  }
});

/**
 * GET /api/kb/articles/:id/versions - Get article version history
 */
router.get('/articles/:id/versions', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const versions = await kbRepository.getArticleVersions(articleId);
    res.json({ versions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch versions' });
  }
});

/**
 * GET /api/kb/articles/:id/versions/:version - Get specific version
 */
router.get('/articles/:id/versions/:version', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const version = Number(req.params.version);
    const articleVersion = await kbRepository.getArticleVersion(articleId, version);

    if (!articleVersion) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(articleVersion);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch version' });
  }
});

/**
 * POST /api/kb/articles/:id/feedback - Submit feedback on article
 */
router.post('/articles/:id/feedback', async (req: Request, res: Response) => {
  try {
    const articleId = Number(req.params.id);
    const { helpful, comment } = req.body;
    const userId = req.user!.id;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Helpful field must be a boolean' });
    }

    // Check if user already provided feedback
    const existingFeedback = await kbRepository.getArticleFeedbackByUser(articleId, userId);
    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already submitted' });
    }

    await kbRepository.createArticleFeedback({
      articleId,
      userId,
      helpful,
      comment,
    });

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to submit feedback' });
  }
});

// Export router
export default router;
