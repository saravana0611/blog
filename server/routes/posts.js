const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { auth, optionalAuth } = require('../middleware/auth');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();

// Validation rules
const postValidation = [
  body('title')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('content')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Invalid category ID'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'pending'])
    .withMessage('Invalid status')
];

// Create new post
router.post('/', auth, postValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, excerpt, categoryId, tags, status = 'published' } = req.body;

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Check if slug already exists
    const existingSlug = await db.query(
      'SELECT id FROM posts WHERE slug = $1',
      [slug]
    );

    if (existingSlug.rows.length > 0) {
      return res.status(400).json({ error: 'A post with this title already exists' });
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(marked(content), {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'pre', 'code']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'code': ['class'],
        'pre': ['class']
      }
    });

    // Create post
    const postResult = await db.query(
      `INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        slug,
        sanitizedContent,
        excerpt || content.substring(0, 200) + '...',
        req.user.id,
        categoryId || null,
        status,
        status === 'published' ? new Date() : null
      ]
    );

    const post = postResult.rows[0];

    // Add tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Create tag if it doesn't exist
        let tagResult = await db.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await db.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        // Link tag to post
        await db.query(
          'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)',
          [post.id, tagId]
        );
      }
    }

    // Get post with author and tags
    const fullPost = await getPostWithDetails(post.id);

    res.status(201).json({
      message: 'Post created successfully',
      post: fullPost
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error while creating post' });
  }
});

// Get all posts with pagination and filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      author,
      status = 'published',
      sort = 'latest',
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    let whereConditions = ['p.status = $1'];
    let queryParams = [status];
    let paramCount = 1;

    if (category) {
      paramCount++;
      whereConditions.push(`c.slug = $${paramCount}`);
      queryParams.push(category);
    }

    if (tag) {
      paramCount++;
      whereConditions.push(`t.name = $${paramCount}`);
      queryParams.push(tag);
    }

    if (author) {
      paramCount++;
      whereConditions.push(`u.username = $${paramCount}`);
      queryParams.push(author);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(p.title ILIKE $${paramCount} OR p.content ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    if (sort === 'trending') {
      orderBy = 'p.trending_score DESC';
    } else if (sort === 'popular') {
      orderBy = 'p.like_count DESC, p.view_count DESC';
    } else if (sort === 'oldest') {
      orderBy = 'p.created_at ASC';
    }

    const query = `
      SELECT p.*, 
             u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT t.color) as tag_colors,
             CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked,
             CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $${paramCount + 1}
      LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $${paramCount + 1}
      ${whereClause}
      GROUP BY p.id, u.username, u.full_name, u.avatar_url, c.name, c.slug, l.user_id, b.user_id
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 2} OFFSET $${paramCount + 3}
    `;

    const postsResult = await db.query(query, [
      ...queryParams,
      userId || null,
      parseInt(limit),
      offset
    ]);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id)
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN users u ON p.author_id = u.id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const totalPosts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = postsResult.rows.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      status: post.status,
      isFeatured: post.is_featured,
      isPinned: post.is_pinned,
      viewCount: post.view_count,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      shareCount: post.share_count,
      trendingScore: post.trending_score,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: {
        id: post.author_id,
        username: post.author_username,
        fullName: post.author_full_name,
        avatarUrl: post.author_avatar
      },
      category: post.category_id ? {
        id: post.category_id,
        name: post.category_name,
        slug: post.category_slug
      } : null,
      tags: post.tags.filter(tag => tag !== null).map((tag, index) => ({
        name: tag,
        color: post.tag_colors[index]
      })),
      isLiked: post.is_liked || false,
      isBookmarked: post.is_bookmarked || false
    }));

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error while fetching posts' });
  }
});

// Get single post by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    // Increment view count
    await db.query(
      'UPDATE posts SET view_count = view_count + 1 WHERE slug = $1',
      [slug]
    );

    const post = await getPostWithDetails(slug, 'slug', userId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });

  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Server error while fetching post' });
  }
});

// Update post
router.put('/:id', auth, postValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, content, excerpt, categoryId, tags, status } = req.body;

    // Check if user owns the post or is admin
    const postCheck = await db.query(
      'SELECT author_id, status FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postCheck.rows[0];
    if (post.author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this post' });
    }

    // Generate new slug if title changed
    let slug = post.slug;
    if (title && title !== post.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Check if new slug already exists
      const existingSlug = await db.query(
        'SELECT id FROM posts WHERE slug = $1 AND id != $2',
        [slug, id]
      );

      if (existingSlug.rows.length > 0) {
        return res.status(400).json({ error: 'A post with this title already exists' });
      }
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(marked(content), {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'pre', 'code']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'code': ['class'],
        'pre': ['class']
      }
    });

    // Update post
    const updateResult = await db.query(
      `UPDATE posts 
       SET title = COALESCE($1, title), 
           slug = $2, 
           content = COALESCE($3, content), 
           excerpt = COALESCE($4, excerpt),
           category_id = $5, 
           status = COALESCE($6, status),
           published_at = CASE WHEN $6 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, slug, sanitizedContent, excerpt, categoryId, status, id]
    );

    // Update tags if provided
    if (tags) {
      // Remove existing tags
      await db.query('DELETE FROM post_tags WHERE post_id = $1', [id]);

      // Add new tags
      for (const tagName of tags) {
        let tagResult = await db.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await db.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await db.query(
          'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }

    const updatedPost = await getPostWithDetails(id, 'id', req.user.id);

    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });

  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Server error while updating post' });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the post or is admin
    const postCheck = await db.query(
      'SELECT author_id FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (postCheck.rows[0].author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await db.query('DELETE FROM posts WHERE id = $1', [id]);

    res.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error while deleting post' });
  }
});

// Like/unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const postCheck = await db.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await db.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, id]
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await db.query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
        [req.user.id, id]
      );

      await db.query(
        'UPDATE posts SET like_count = like_count - 1 WHERE id = $1',
        [id]
      );

      res.json({ message: 'Post unliked', liked: false });
    } else {
      // Like
      await db.query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [req.user.id, id]
      );

      await db.query(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = $1',
        [id]
      );

      res.json({ message: 'Post liked', liked: true });
    }

  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Server error while liking post' });
  }
});

// Bookmark/unbookmark post
router.post('/:id/bookmark', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const postCheck = await db.query(
      'SELECT id FROM posts WHERE id = $1',
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already bookmarked
    const existingBookmark = await db.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND post_id = $2',
      [req.user.id, id]
    );

    if (existingBookmark.rows.length > 0) {
      // Remove bookmark
      await db.query(
        'DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2',
        [req.user.id, id]
      );

      res.json({ message: 'Bookmark removed', bookmarked: false });
    } else {
      // Add bookmark
      await db.query(
        'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2)',
        [req.user.id, id]
      );

      res.json({ message: 'Post bookmarked', bookmarked: true });
    }

  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({ error: 'Server error while bookmarking post' });
  }
});

// Helper function to get post with all details
async function getPostWithDetails(identifier, field = 'id', userId = null) {
  const query = `
    SELECT p.*, 
           u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
           c.name as category_name, c.slug as category_slug,
           ARRAY_AGG(DISTINCT t.name) as tags,
           ARRAY_AGG(DISTINCT t.color) as tag_colors,
           CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked,
           CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN post_tags pt ON p.id = pt.post_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $2
    LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $2
    WHERE p.${field} = $1
    GROUP BY p.id, u.username, u.full_name, u.avatar_url, c.name, c.slug, l.user_id, b.user_id
  `;

  const result = await db.query(query, [identifier, userId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const post = result.rows[0];
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    isFeatured: post.is_featured,
    isPinned: post.is_pinned,
    viewCount: post.view_count,
    likeCount: post.like_count,
    commentCount: post.comment_count,
    shareCount: post.share_count,
    trendingScore: post.trending_score,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    author: {
      id: post.author_id,
      username: post.author_username,
      fullName: post.author_full_name,
      avatarUrl: post.author_avatar
    },
    category: post.category_id ? {
      id: post.category_id,
      name: post.category_name,
      slug: post.category_slug
    } : null,
    tags: post.tags.filter(tag => tag !== null).map((tag, index) => ({
      name: tag,
      color: post.tag_colors[index]
    })),
    isLiked: post.is_liked || false,
    isBookmarked: post.is_bookmarked || false
  };
}

module.exports = router;


