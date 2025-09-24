const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { auth, adminOnly, moderatorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin authentication
router.use(auth);
router.use(adminOnly);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Get various statistics
    const stats = await Promise.all([
      // Total users
      db.query('SELECT COUNT(*) as count FROM users'),
      // Total posts
      db.query('SELECT COUNT(*) as count FROM posts'),
      // Total comments
      db.query('SELECT COUNT(*) as count FROM comments'),
      // Pending posts
      db.query("SELECT COUNT(*) as count FROM posts WHERE status = 'pending'"),
      // Pending reports
      db.query("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'"),
      // Today's new users
      db.query("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE"),
      // Today's new posts
      db.query("SELECT COUNT(*) as count FROM posts WHERE DATE(created_at) = CURRENT_DATE"),
      // Today's new comments
      db.query("SELECT COUNT(*) as count FROM comments WHERE DATE(created_at) = CURRENT_DATE")
    ]);

    const [
      totalUsers,
      totalPosts,
      totalComments,
      pendingPosts,
      pendingReports,
      newUsersToday,
      newPostsToday,
      newCommentsToday
    ] = stats.map(result => parseInt(result.rows[0].count));

    // Get recent activity
    const recentPosts = await db.query(`
      SELECT p.*, u.username as author_username
      FROM posts p
      JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    const recentUsers = await db.query(`
      SELECT username, email, created_at, is_verified
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const recentReports = await db.query(`
      SELECT r.*, u.username as reporter_username, 
             CASE 
               WHEN r.post_id IS NOT NULL THEN 'post'
               WHEN r.comment_id IS NOT NULL THEN 'comment'
               ELSE 'user'
             END as report_type
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);

    res.json({
      stats: {
        totalUsers,
        totalPosts,
        totalComments,
        pendingPosts,
        pendingReports,
        newUsersToday,
        newPostsToday,
        newCommentsToday
      },
      recentActivity: {
        posts: recentPosts.rows,
        users: recentUsers.rows,
        reports: recentReports.rows
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error while fetching dashboard' });
  }
});

// Get pending posts for moderation
router.get('/posts/pending', moderatorOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await db.query(`
      SELECT p.*, 
             u.username as author_username, u.full_name as author_full_name,
             c.name as category_name,
             ARRAY_AGG(DISTINCT t.name) as tags
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.status = 'pending'
      GROUP BY p.id, u.username, u.full_name, c.name
      ORDER BY p.created_at ASC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    const countResult = await db.query(
      "SELECT COUNT(*) FROM posts WHERE status = 'pending'"
    );
    const totalPosts = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts: posts.rows.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        status: post.status,
        createdAt: post.created_at,
        author: {
          username: post.author_username,
          fullName: post.author_full_name
        },
        category: post.category_name,
        tags: post.tags.filter(tag => tag !== null)
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
    console.error('Get pending posts error:', error);
    res.status(500).json({ error: 'Server error while fetching pending posts' });
  }
});

// Approve/reject post
router.post('/posts/:id/moderate', moderatorOrAdmin, [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { action, reason } = req.body;

    // Check if post exists and is pending
    const postCheck = await db.query(
      'SELECT id, author_id, title FROM posts WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pending post not found' });
    }

    const post = postCheck.rows[0];
    const newStatus = action === 'approve' ? 'published' : 'rejected';

    // Update post status
    await db.query(
      `UPDATE posts 
       SET status = $1, 
           published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2`,
      [newStatus, id]
    );

    // Create notification for user
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        post.author_id,
        'post_moderation',
        `Post ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        `Your post "${post.title}" has been ${action === 'approve' ? 'approved and published' : 'rejected'}${reason ? `: ${reason}` : ''}`,
        { postId: id, action, reason }
      ]
    );

    // Log moderation action
    await db.query(
      `INSERT INTO reports (reporter_id, post_id, reason, description, status, moderator_id, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        id,
        `Post ${action}`,
        reason || `Post was ${action === 'approve' ? 'approved' : 'rejected'} by moderator`,
        'resolved',
        req.user.id
      ]
    );

    res.json({
      message: `Post ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      status: newStatus
    });

  } catch (error) {
    console.error('Moderate post error:', error);
    res.status(500).json({ error: 'Server error while moderating post' });
  }
});

// Get pending reports
router.get('/reports', moderatorOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const offset = (page - 1) * limit;

    const reports = await db.query(`
      SELECT r.*, 
             u1.username as reporter_username,
             u2.username as reported_user_username,
             p.title as post_title,
             c.content as comment_content,
             CASE 
               WHEN r.post_id IS NOT NULL THEN 'post'
               WHEN r.comment_id IS NOT NULL THEN 'comment'
               ELSE 'user'
             END as report_type
      FROM reports r
      JOIN users u1 ON r.reporter_id = u1.id
      LEFT JOIN users u2 ON r.reported_user_id = u2.id
      LEFT JOIN posts p ON r.post_id = p.id
      LEFT JOIN comments c ON r.comment_id = c.id
      WHERE r.status = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, parseInt(limit), offset]);

    const countResult = await db.query(
      'SELECT COUNT(*) FROM reports WHERE status = $1',
      [status]
    );
    const totalReports = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalReports / limit);

    res.json({
      reports: reports.rows.map(report => ({
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.created_at,
        resolvedAt: report.resolved_at,
        reporter: {
          username: report.reporter_username
        },
        reportedUser: report.reported_user_username ? {
          username: report.reported_user_username
        } : null,
        post: report.post_title ? {
          title: report.post_title
        } : null,
        comment: report.comment_content ? {
          content: report.comment_content.substring(0, 100) + '...'
        } : null,
        reportType: report.report_type
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReports,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error while fetching reports' });
  }
});

// Resolve report
router.post('/reports/:id/resolve', moderatorOrAdmin, [
  body('action').isIn(['dismiss', 'warn', 'ban', 'delete']).withMessage('Invalid action'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { action, reason } = req.body;

    // Get report details
    const reportCheck = await db.query(
      'SELECT * FROM reports WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pending report not found' });
    }

    const report = reportCheck.rows[0];

    // Update report status
    await db.query(
      'UPDATE reports SET status = $1, moderator_id = $2, resolved_at = NOW() WHERE id = $3',
      ['resolved', req.user.id, id]
    );

    let actionTaken = '';

    // Take action based on report type and action
    if (action === 'delete') {
      if (report.post_id) {
        await db.query('DELETE FROM posts WHERE id = $1', [report.post_id]);
        actionTaken = 'Post deleted';
      } else if (report.comment_id) {
        await db.query('DELETE FROM comments WHERE id = $1', [report.comment_id]);
        actionTaken = 'Comment deleted';
      }
    } else if (action === 'ban' && report.reported_user_id) {
      await db.query(
        'UPDATE users SET is_banned = true WHERE id = $1',
        [report.reported_user_id]
      );
      actionTaken = 'User banned';
    } else if (action === 'warn' && report.reported_user_id) {
      // Create warning notification
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          report.reported_user_id,
          'warning',
          'Content Violation Warning',
          `Your content has been reported and flagged for review. Please ensure your posts and comments comply with our community guidelines.${reason ? ` Reason: ${reason}` : ''}`,
          { reportId: id, reason }
        ]
      );
      actionTaken = 'User warned';
    }

    // Create notification for reporter
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        report.reporter_id,
        'report_resolved',
        'Report Resolved',
        `Your report has been reviewed and resolved. Action taken: ${actionTaken}${reason ? `. Reason: ${reason}` : ''}`,
        { reportId: id, action, reason }
      ]
    );

    res.json({
      message: 'Report resolved successfully',
      actionTaken
    });

  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Server error while resolving report' });
  }
});

// Get all users with pagination and filters
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      if (role === 'admin') {
        whereConditions.push('u.is_admin = true');
      } else if (role === 'moderator') {
        whereConditions.push('u.is_moderator = true');
      } else if (role === 'user') {
        whereConditions.push('u.is_admin = false AND u.is_moderator = false');
      }
    }

    if (status) {
      paramCount++;
      if (status === 'banned') {
        whereConditions.push('u.is_banned = true');
      } else if (status === 'active') {
        whereConditions.push('u.is_banned = false');
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const users = await db.query(`
      SELECT u.*, 
             COUNT(DISTINCT p.id) as post_count,
             COUNT(DISTINCT c.id) as comment_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
      LEFT JOIN comments c ON u.id = c.author_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, parseInt(limit), offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) FROM users u ${whereClause}
    `, queryParams);
    const totalUsers = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users: users.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        isAdmin: user.is_admin,
        isModerator: user.is_moderator,
        isBanned: user.is_banned,
        reputation: user.reputation,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        stats: {
          postCount: parseInt(user.post_count),
          commentCount: parseInt(user.comment_count)
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error while fetching users' });
  }
});

// Update user role or status
router.put('/users/:id', [
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean'),
  body('isModerator').optional().isBoolean().withMessage('isModerator must be a boolean'),
  body('isBanned').optional().isBoolean().withMessage('isBanned must be a boolean'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { isAdmin, isModerator, isBanned, isVerified } = req.body;

    // Check if user exists
    const userCheck = await db.query(
      'SELECT id, username FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from removing their own admin status
    if (id === req.user.id && isAdmin === false) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (isAdmin !== undefined) {
      paramCount++;
      updateFields.push(`is_admin = $${paramCount}`);
      updateValues.push(isAdmin);
    }

    if (isModerator !== undefined) {
      paramCount++;
      updateFields.push(`is_moderator = $${paramCount}`);
      updateValues.push(isModerator);
    }

    if (isBanned !== undefined) {
      paramCount++;
      updateFields.push(`is_banned = $${paramCount}`);
      updateValues.push(isBanned);
    }

    if (isVerified !== undefined) {
      paramCount++;
      updateFields.push(`is_verified = $${paramCount}`);
      updateValues.push(isVerified);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    updateValues.push(id);

    await db.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
      updateValues
    );

    res.json({
      message: 'User updated successfully',
      userId: id
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error while updating user' });
  }
});

// Get site settings
router.get('/settings', async (req, res) => {
  try {
    // This would typically come from a settings table
    // For now, return default settings
    res.json({
      siteName: 'Tech Blog Platform',
      siteDescription: 'A platform for technical discussions and knowledge sharing',
      allowRegistration: true,
      requireEmailVerification: false,
      requirePostApproval: true,
      maxPostsPerDay: 5,
      maxCommentsPerDay: 20,
      maxTagsPerPost: 10,
      maxImageSize: 5242880, // 5MB
      allowedImageTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error while fetching settings' });
  }
});

// Update site settings
router.put('/settings', [
  body('siteName').optional().isLength({ min: 1, max: 100 }).withMessage('Site name must be between 1 and 100 characters'),
  body('siteDescription').optional().isLength({ max: 500 }).withMessage('Site description must be less than 500 characters'),
  body('allowRegistration').optional().isBoolean().withMessage('allowRegistration must be a boolean'),
  body('requireEmailVerification').optional().isBoolean().withMessage('requireEmailVerification must be a boolean'),
  body('requirePostApproval').optional().isBoolean().withMessage('requirePostApproval must be a boolean'),
  body('maxPostsPerDay').optional().isInt({ min: 1, max: 100 }).withMessage('maxPostsPerDay must be between 1 and 100'),
  body('maxCommentsPerDay').optional().isInt({ min: 1, max: 100 }).withMessage('maxCommentsPerDay must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // This would typically update a settings table
    // For now, just return success
    res.json({
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error while updating settings' });
  }
});

module.exports = router;


