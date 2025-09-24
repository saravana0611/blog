const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const profileUpdateValidation = [
  body('fullName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Full name must be less than 100 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL')
];

// Get user profile by username
router.get('/profile/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const userId = req.user?.id;

    const userResult = await db.query(`
      SELECT u.*, 
             COUNT(DISTINCT f.following_id) as following_count,
             COUNT(DISTINCT f2.follower_id) as followers_count,
             COUNT(DISTINCT p.id) as post_count,
             COUNT(DISTINCT c.id) as comment_count,
             CASE WHEN f3.follower_id IS NOT NULL THEN true ELSE false END as is_following
      FROM users u
      LEFT JOIN follows f ON u.id = f.follower_id
      LEFT JOIN follows f2 ON u.id = f2.following_id
      LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
      LEFT JOIN comments c ON u.id = c.author_id
      LEFT JOIN follows f3 ON u.id = f3.following_id AND f3.follower_id = $2
      WHERE u.username = $1 AND u.is_banned = false
      GROUP BY u.id, f3.follower_id
    `, [username, userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's recent posts
    const recentPosts = await db.query(`
      SELECT p.*, 
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT t.color) as tag_colors
      FROM posts p
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.author_id = $1 AND p.status = 'published'
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [user.id]);

    // Get user's recent comments
    const recentComments = await db.query(`
      SELECT c.*, p.title as post_title, p.slug as post_slug
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.author_id = $1 AND p.status = 'published'
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [user.id]);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        reputation: user.reputation,
        createdAt: user.created_at,
        stats: {
          followingCount: parseInt(user.following_count),
          followersCount: parseInt(user.followers_count),
          postCount: parseInt(user.post_count),
          commentCount: parseInt(user.comment_count)
        },
        isFollowing: user.is_following || false
      },
      recentPosts: recentPosts.rows.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        viewCount: post.view_count,
        likeCount: post.like_count,
        commentCount: post.comment_count,
        createdAt: post.created_at,
        tags: post.tags.filter(tag => tag !== null).map((tag, index) => ({
          name: tag,
          color: post.tag_colors[index]
        }))
      })),
      recentComments: recentComments.rows.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        post: {
          title: comment.post_title,
          slug: comment.post_slug
        }
      }))
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error while fetching user profile' });
  }
});

// Update user profile
router.put('/profile', auth, profileUpdateValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, bio, avatarUrl } = req.body;

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (fullName !== undefined) {
      paramCount++;
      updateFields.push(`full_name = $${paramCount}`);
      updateValues.push(fullName);
    }

    if (bio !== undefined) {
      paramCount++;
      updateFields.push(`bio = $${paramCount}`);
      updateValues.push(bio);
    }

    if (avatarUrl !== undefined) {
      paramCount++;
      updateFields.push(`avatar_url = $${paramCount}`);
      updateValues.push(avatarUrl);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    updateValues.push(req.user.id);

    await db.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
      updateValues
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        fullName,
        bio,
        avatarUrl
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
});

// Follow user
router.post('/follow/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;

    // Check if user exists and is not banned
    const userCheck = await db.query(
      'SELECT id FROM users WHERE username = $1 AND is_banned = false',
      [username]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = userCheck.rows[0].id;

    // Prevent self-following
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existingFollow = await db.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, targetUserId]
    );

    if (existingFollow.rows.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    await db.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [req.user.id, targetUserId]
    );

    // Create notification for followed user
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        targetUserId,
        'new_follower',
        'New Follower',
        `${req.user.username} started following you`,
        { followerId: req.user.id, followerUsername: req.user.username }
      ]
    );

    res.json({
      message: 'User followed successfully',
      following: true
    });

  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Server error while following user' });
  }
});

// Unfollow user
router.delete('/follow/:username', auth, async (req, res) => {
  try {
    const { username } = req.params;

    // Check if user exists
    const userCheck = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = userCheck.rows[0].id;

    // Remove follow relationship
    const result = await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, targetUserId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    res.json({
      message: 'User unfollowed successfully',
      following: false
    });

  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Server error while unfollowing user' });
  }
});

// Get user's followers
router.get('/:username/followers', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    // Check if user exists
    const userCheck = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = userCheck.rows[0].id;

    // Get followers
    const followers = await db.query(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, u.reputation,
             CASE WHEN f.follower_id IS NOT NULL THEN true ELSE false END as is_following
      FROM users u
      JOIN follows f ON u.id = f.follower_id
      LEFT JOIN follows f2 ON u.id = f2.following_id AND f2.follower_id = $3
      WHERE f.following_id = $1 AND u.is_banned = false
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $4
    `, [targetUserId, parseInt(limit), userId, offset]);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [targetUserId]
    );

    const totalFollowers = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalFollowers / limit);

    res.json({
      followers: followers.rows.map(follower => ({
        id: follower.id,
        username: follower.username,
        fullName: follower.full_name,
        avatarUrl: follower.avatar_url,
        isVerified: follower.is_verified,
        reputation: follower.reputation,
        isFollowing: follower.is_following || false
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFollowers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Server error while fetching followers' });
  }
});

// Get user's following
router.get('/:username/following', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    // Check if user exists
    const userCheck = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = userCheck.rows[0].id;

    // Get following
    const following = await db.query(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.is_verified, u.reputation,
             CASE WHEN f2.follower_id IS NOT NULL THEN true ELSE false END as is_following
      FROM users u
      JOIN follows f ON u.id = f.following_id
      LEFT JOIN follows f2 ON u.id = f2.following_id AND f2.follower_id = $3
      WHERE f.follower_id = $1 AND u.is_banned = false
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $4
    `, [targetUserId, parseInt(limit), userId, offset]);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [targetUserId]
    );

    const totalFollowing = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalFollowing / limit);

    res.json({
      following: following.rows.map(followed => ({
        id: followed.id,
        username: followed.username,
        fullName: followed.full_name,
        avatarUrl: followed.avatar_url,
        isVerified: followed.is_verified,
        reputation: followed.reputation,
        isFollowing: followed.is_following || false
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFollowing,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Server error while fetching following' });
  }
});

// Get user's posts
router.get('/:username/posts', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    // Check if user exists
    const userCheck = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = userCheck.rows[0].id;

    // Check if current user can view posts (only published posts for non-owners, unless admin)
    let statusFilter = "p.status = 'published'";
    if (userId === targetUserId || req.user?.is_admin) {
      statusFilter = `p.status = '${status}'`;
    }

    // Get posts
    const posts = await db.query(`
      SELECT p.*, 
             c.name as category_name, c.slug as category_slug,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT t.color) as tag_colors,
             CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked,
             CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END as is_bookmarked
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = $3
      LEFT JOIN bookmarks b ON p.id = b.post_id AND b.user_id = $3
      WHERE p.author_id = $1 AND ${statusFilter}
      GROUP BY p.id, c.name, c.slug, l.user_id, b.user_id
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $4
    `, [targetUserId, parseInt(limit), userId, offset]);

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM posts WHERE author_id = $1 AND ${statusFilter}`,
      [targetUserId]
    );

    const totalPosts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: posts.rows.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        status: post.status,
        viewCount: post.view_count,
        likeCount: post.like_count,
        commentCount: post.comment_count,
        createdAt: post.created_at,
        publishedAt: post.published_at,
        category: post.category_id ? {
          name: post.category_name,
          slug: post.category_slug
        } : null,
        tags: post.tags.filter(tag => tag !== null).map((tag, index) => ({
          name: tag,
          color: post.tag_colors[index]
        })),
        isLiked: post.is_liked || false,
        isBookmarked: post.is_bookmarked || false
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Server error while fetching user posts' });
  }
});

// Get user's bookmarks
router.get('/bookmarks', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get bookmarked posts
    const bookmarks = await db.query(`
      SELECT p.*, 
             u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT t.color) as tag_colors,
             b.created_at as bookmarked_at
      FROM bookmarks b
      JOIN posts p ON b.post_id = p.id
      JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE b.user_id = $1 AND p.status = 'published'
      GROUP BY p.id, u.username, u.full_name, u.avatar_url, c.name, c.slug, b.created_at
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), offset]);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM bookmarks WHERE user_id = $1',
      [req.user.id]
    );

    const totalBookmarks = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookmarks / limit);

    res.json({
      bookmarks: bookmarks.rows.map(bookmark => ({
        id: bookmark.id,
        title: bookmark.title,
        slug: bookmark.slug,
        excerpt: bookmark.excerpt,
        viewCount: bookmark.view_count,
        likeCount: bookmark.like_count,
        commentCount: bookmark.comment_count,
        createdAt: bookmark.created_at,
        bookmarkedAt: bookmark.bookmarked_at,
        author: {
          username: bookmark.author_username,
          fullName: bookmark.author_full_name,
          avatarUrl: bookmark.author_avatar
        },
        category: bookmark.category_id ? {
          name: bookmark.category_name,
          slug: bookmark.category_slug
        } : null,
        tags: bookmark.tags.filter(tag => tag !== null).map((tag, index) => ({
          name: tag,
          color: bookmark.tag_colors[index]
        }))
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookmarks,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Server error while fetching bookmarks' });
  }
});

// Get user's notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'user_id = $1';
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (unreadOnly === 'true') {
      paramCount++;
      whereClause += ` AND is_read = false`;
    }

    // Get notifications
    const notifications = await db.query(`
      SELECT id, type, title, message, data, is_read, created_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`,
      queryParams
    );

    const totalNotifications = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalNotifications / limit);

    res.json({
      notifications: notifications.rows.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.is_read,
        createdAt: notification.created_at
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalNotifications,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error while fetching notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error while marking notification as read' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Server error while marking all notifications as read' });
  }
});

module.exports = router;


