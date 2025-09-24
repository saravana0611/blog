const express = require('express');
const db = require('../database/connection');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Global search across posts, users, and tags
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    const offset = (page - 1) * limit;
    const searchQuery = q.trim();

    // Log search for analytics
    await db.query(
      `INSERT INTO search_history (user_id, query, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [
        userId || null,
        searchQuery,
        req.ip || null,
        req.get('User-Agent') || null
      ]
    );

    let results = {};
    let totalResults = 0;

    // Search posts
    if (!type || type === 'posts' || type === 'all') {
      const postsQuery = `
        SELECT p.*, 
               u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
               c.name as category_name, c.slug as category_slug,
               ARRAY_AGG(DISTINCT t.name) as tags,
               ARRAY_AGG(DISTINCT t.color) as tag_colors,
               CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked,
               CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked,
               ts_rank(to_tsvector('english', p.title || ' ' || p.content), plainto_tsquery('english', $1)) as rank
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $3
        LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $3
        WHERE p.status = 'published' 
          AND (p.title ILIKE $2 OR p.content ILIKE $2 OR p.excerpt ILIKE $2)
        GROUP BY p.id, u.username, u.full_name, u.avatar_url, c.name, c.slug, l.user_id, b.user_id
        ORDER BY rank DESC, p.created_at DESC
        LIMIT $4 OFFSET $5
      `;

      const postsResult = await db.query(postsQuery, [
        searchQuery,
        `%${searchQuery}%`,
        userId || null,
        parseInt(limit),
        offset
      ]);

      const postsCountResult = await db.query(
        `SELECT COUNT(DISTINCT p.id)
         FROM posts p
         WHERE p.status = 'published' 
           AND (p.title ILIKE $1 OR p.content ILIKE $1 OR p.excerpt ILIKE $1)`,
        [`%${searchQuery}%`]
      );

      const postsCount = parseInt(postsCountResult.rows[0].count);
      totalResults += postsCount;

      results.posts = {
        items: postsResult.rows.map(post => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          status: post.status,
          viewCount: post.view_count,
          likeCount: post.like_count,
          commentCount: post.comment_count,
          createdAt: post.created_at,
          publishedAt: post.published_at,
          author: {
            username: post.author_username,
            fullName: post.author_full_name,
            avatarUrl: post.author_avatar
          },
          category: post.category_id ? {
            name: post.category_name,
            slug: post.category_slug
          } : null,
          tags: post.tags.filter(tag => tag !== null).map((tag, index) => ({
            name: tag,
            color: post.tag_colors[index]
          })),
          isLiked: post.is_liked || false,
          isBookmarked: post.is_bookmarked || false,
          rank: post.rank
        })),
        total: postsCount,
        hasMore: postsCount > parseInt(limit)
      };
    }

    // Search users
    if (!type || type === 'users' || type === 'all') {
      const usersQuery = `
        SELECT u.*, 
               COUNT(DISTINCT p.id) as post_count,
               COUNT(DISTINCT c.id) as comment_count,
               CASE WHEN f.follower_id IS NOT NULL THEN true ELSE false END as is_following
        FROM users u
        LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
        LEFT JOIN comments c ON u.id = c.author_id
        LEFT JOIN follows f ON u.id = f.following_id AND f.follower_id = $2
        WHERE u.is_banned = false 
          AND (u.username ILIKE $1 OR u.full_name ILIKE $1 OR u.bio ILIKE $1)
        GROUP BY u.id, f.follower_id
        ORDER BY 
          CASE 
            WHEN u.username ILIKE $1 THEN 1
            WHEN u.full_name ILIKE $1 THEN 2
            ELSE 3
          END,
          u.reputation DESC
        LIMIT $3 OFFSET $4
      `;

      const usersResult = await db.query(usersQuery, [
        `%${searchQuery}%`,
        userId || null,
        parseInt(limit),
        offset
      ]);

      const usersCountResult = await db.query(
        `SELECT COUNT(*)
         FROM users u
         WHERE u.is_banned = false 
           AND (u.username ILIKE $1 OR u.full_name ILIKE $1 OR u.bio ILIKE $1)`,
        [`%${searchQuery}%`]
      );

      const usersCount = parseInt(usersCountResult.rows[0].count);
      totalResults += usersCount;

      results.users = {
        items: usersResult.rows.map(user => ({
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          isVerified: user.is_verified,
          reputation: user.reputation,
          createdAt: user.created_at,
          stats: {
            postCount: parseInt(user.post_count),
            commentCount: parseInt(user.comment_count)
          },
          isFollowing: user.is_following || false
        })),
        total: usersCount,
        hasMore: usersCount > parseInt(limit)
      };
    }

    // Search tags
    if (!type || type === 'tags' || type === 'all') {
      const tagsQuery = `
        SELECT t.*, 
               COUNT(DISTINCT pt.post_id) as post_count
        FROM tags t
        LEFT JOIN post_tags pt ON t.id = pt.tag_id
        LEFT JOIN posts p ON pt.post_id = p.id AND p.status = 'published'
        WHERE t.name ILIKE $1 OR t.description ILIKE $1
        GROUP BY t.id
        ORDER BY 
          CASE 
            WHEN t.name ILIKE $1 THEN 1
            ELSE 2
          END,
          post_count DESC
        LIMIT $2 OFFSET $3
      `;

      const tagsResult = await db.query(tagsQuery, [
        `%${searchQuery}%`,
        parseInt(limit),
        offset
      ]);

      const tagsCountResult = await db.query(
        `SELECT COUNT(*)
         FROM tags t
         WHERE t.name ILIKE $1 OR t.description ILIKE $1`,
        [`%${searchQuery}%`]
      );

      const tagsCount = parseInt(tagsCountResult.rows[0].count);
      totalResults += tagsCount;

      results.tags = {
        items: tagsResult.rows.map(tag => ({
          id: tag.id,
          name: tag.name,
          description: tag.description,
          color: tag.color,
          postCount: parseInt(tag.post_count),
          createdAt: tag.created_at
        })),
        total: tagsCount,
        hasMore: tagsCount > parseInt(limit)
      };
    }

    // Search comments
    if (!type || type === 'comments' || type === 'all') {
      const commentsQuery = `
        SELECT c.*, 
               u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
               p.title as post_title, p.slug as post_slug,
               CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked
        FROM comments c
        JOIN users u ON c.author_id = u.id
        JOIN posts p ON c.post_id = p.id
        LEFT JOIN likes l ON c.id = l.comment_id AND l.user_id = $2
        WHERE p.status = 'published' 
          AND c.content ILIKE $1
        ORDER BY c.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const commentsResult = await db.query(commentsQuery, [
        `%${searchQuery}%`,
        userId || null,
        parseInt(limit),
        offset
      ]);

      const commentsCountResult = await db.query(
        `SELECT COUNT(*)
         FROM comments c
         JOIN posts p ON c.post_id = p.id
         WHERE p.status = 'published' 
           AND c.content ILIKE $1`,
        [`%${searchQuery}%`]
      );

      const commentsCount = parseInt(commentsCountResult.rows[0].count);
      totalResults += commentsCount;

      results.comments = {
        items: commentsResult.rows.map(comment => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          likeCount: comment.like_count,
          author: {
            username: comment.author_username,
            fullName: comment.author_full_name,
            avatarUrl: comment.author_avatar
          },
          post: {
            title: comment.post_title,
            slug: comment.post_slug
          },
          isLiked: comment.is_liked || false
        })),
        total: commentsCount,
        hasMore: commentsCount > parseInt(limit)
      };
    }

    // Update search results count
    await db.query(
      'UPDATE search_history SET results_count = $1 WHERE query = $2 AND user_id = $3 ORDER BY created_at DESC LIMIT 1',
      [totalResults, searchQuery, userId || null]
    );

    res.json({
      query: searchQuery,
      totalResults,
      results,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        hasMore: totalResults > parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error while performing search' });
  }
});

// Search suggestions/autocomplete
router.get('/suggestions', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ suggestions: [] });
    }

    const searchQuery = q.trim();
    const suggestions = [];

    // Post title suggestions
    if (type === 'all' || type === 'posts') {
      const postSuggestions = await db.query(`
        SELECT DISTINCT title, slug
        FROM posts
        WHERE status = 'published' AND title ILIKE $1
        ORDER BY 
          CASE 
            WHEN title ILIKE $2 THEN 1
            WHEN title ILIKE $3 THEN 2
            ELSE 3
          END,
          view_count DESC
        LIMIT 5
      `, [
        `%${searchQuery}%`,
        `${searchQuery}%`,
        `%${searchQuery}%`
      ]);

      suggestions.push(...postSuggestions.rows.map(post => ({
        type: 'post',
        text: post.title,
        value: post.slug,
        category: 'Posts'
      })));
    }

    // User suggestions
    if (type === 'all' || type === 'users') {
      const userSuggestions = await db.query(`
        SELECT username, full_name
        FROM users
        WHERE is_banned = false AND (username ILIKE $1 OR full_name ILIKE $1)
        ORDER BY 
          CASE 
            WHEN username ILIKE $2 THEN 1
            WHEN full_name ILIKE $2 THEN 2
            ELSE 3
          END,
          reputation DESC
        LIMIT 5
      `, [
        `%${searchQuery}%`,
        `${searchQuery}%`
      ]);

      suggestions.push(...userSuggestions.rows.map(user => ({
        type: 'user',
        text: user.full_name || user.username,
        value: user.username,
        category: 'Users'
      })));
    }

    // Tag suggestions
    if (type === 'all' || type === 'tags') {
      const tagSuggestions = await db.query(`
        SELECT name, description
        FROM tags
        WHERE name ILIKE $1 OR description ILIKE $1
        ORDER BY 
          CASE 
            WHEN name ILIKE $2 THEN 1
            ELSE 2
          END,
          post_count DESC
        LIMIT 5
      `, [
        `%${searchQuery}%`,
        `${searchQuery}%`
      ]);

      suggestions.push(...tagSuggestions.rows.map(tag => ({
        type: 'tag',
        text: tag.name,
        value: tag.name,
        category: 'Tags',
        description: tag.description
      })));
    }

    // Sort suggestions by relevance
    suggestions.sort((a, b) => {
      const aStartsWith = a.text.toLowerCase().startsWith(searchQuery.toLowerCase());
      const bStartsWith = b.text.toLowerCase().startsWith(searchQuery.toLowerCase());
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return 0;
    });

    res.json({ suggestions: suggestions.slice(0, 10) });

  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Server error while fetching suggestions' });
  }
});

// Get trending searches
router.get('/trending', async (req, res) => {
  try {
    const { period = 'week', limit = 10 } = req.query;

    let timeFilter = '';
    if (period === 'day') {
      timeFilter = "AND created_at >= CURRENT_DATE";
    } else if (period === 'week') {
      timeFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      timeFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const trendingSearches = await db.query(`
      SELECT query, COUNT(*) as search_count, AVG(results_count) as avg_results
      FROM search_history
      WHERE query IS NOT NULL ${timeFilter}
      GROUP BY query
      ORDER BY search_count DESC, avg_results DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      period,
      searches: trendingSearches.rows.map(search => ({
        query: search.query,
        searchCount: parseInt(search.search_count),
        avgResults: Math.round(parseFloat(search.avg_results) || 0)
      }))
    });

  } catch (error) {
    console.error('Trending searches error:', error);
    res.status(500).json({ error: 'Server error while fetching trending searches' });
  }
});

// Get search analytics (admin only)
router.get('/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await db.query(`
      SELECT 
        DATE(created_at) as search_date,
        COUNT(*) as total_searches,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(results_count) as avg_results,
        COUNT(CASE WHEN results_count = 0 THEN 1 END) as no_results
      FROM search_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at)
      ORDER BY search_date DESC
    `, [parseInt(days)]);

    const topQueries = await db.query(`
      SELECT query, COUNT(*) as search_count
      FROM search_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT 10
    `, [parseInt(days)]);

    const topNoResults = await db.query(`
      SELECT query, COUNT(*) as search_count
      FROM search_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
        AND results_count = 0
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT 10
    `, [parseInt(days)]);

    res.json({
      period: `${days} days`,
      dailyStats: analytics.rows.map(day => ({
        date: day.search_date,
        totalSearches: parseInt(day.total_searches),
        uniqueUsers: parseInt(day.unique_users),
        avgResults: Math.round(parseFloat(day.avg_results) || 0),
        noResults: parseInt(day.no_results)
      })),
      topQueries: topQueries.rows.map(query => ({
        query: query.query,
        searchCount: parseInt(query.search_count)
      })),
      topNoResults: topNoResults.rows.map(query => ({
        query: query.query,
        searchCount: parseInt(query.search_count)
      }))
    });

  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ error: 'Server error while fetching search analytics' });
  }
});

module.exports = router;


