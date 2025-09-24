const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { auth, optionalAuth } = require('../middleware/auth');
const sanitizeHtml = require('sanitize-html');

const router = express.Router();

// Validation rules
const commentValidation = [
  body('content')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Comment must be between 1 and 5000 characters'),
  body('postId')
    .isUUID()
    .withMessage('Invalid post ID'),
  body('parentId')
    .optional()
    .isUUID()
    .withMessage('Invalid parent comment ID')
];

// Create new comment
router.post('/', auth, commentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, postId, parentId } = req.body;

    // Check if post exists
    const postCheck = await db.query(
      'SELECT id, status FROM posts WHERE id = $1',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (postCheck.rows[0].status !== 'published') {
      return res.status(400).json({ error: 'Cannot comment on unpublished post' });
    }

    // Check if parent comment exists (if replying to another comment)
    if (parentId) {
      const parentCheck = await db.query(
        'SELECT id FROM comments WHERE id = $1 AND post_id = $2',
        [parentId, postId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent comment not found' });
      }
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['code', 'pre']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'code': ['class'],
        'pre': ['class']
      }
    });

    // Create comment
    const result = await db.query(
      `INSERT INTO comments (content, author_id, post_id, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sanitizedContent, req.user.id, postId, parentId || null]
    );

    const comment = result.rows[0];

    // Increment comment count on post
    await db.query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );

    // Get comment with author details
    const fullComment = await getCommentWithDetails(comment.id);

    // Emit real-time update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`post-${postId}`).emit('new-comment', {
        comment: fullComment,
        postId: postId
      });
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment: fullComment
    });

  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Server error while creating comment' });
  }
});

// Get comments for a post
router.get('/post/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    const userId = req.user?.id;

    const offset = (page - 1) * limit;

    // Check if post exists
    const postCheck = await db.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let orderBy = 'c.created_at DESC';
    if (sort === 'oldest') {
      orderBy = 'c.created_at ASC';
    } else if (sort === 'popular') {
      orderBy = 'c.like_count DESC, c.created_at DESC';
    }

    // Get top-level comments
    const commentsQuery = `
      SELECT c.*, 
             u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
             CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked,
             COUNT(r.id) as reply_count
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      LEFT JOIN likes l ON c.id = l.comment_id AND l.user_id = $3
      LEFT JOIN comments r ON c.id = r.parent_id
      WHERE c.post_id = $1 AND c.parent_id IS NULL
      GROUP BY c.id, u.username, u.full_name, u.avatar_url, l.user_id
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $4
    `;

    const commentsResult = await db.query(commentsQuery, [
      postId,
      parseInt(limit),
      userId || null,
      offset
    ]);

    // Get total count for pagination
    const countResult = await db.query(
      'SELECT COUNT(*) FROM comments WHERE post_id = $1 AND parent_id IS NULL',
      [postId]
    );

    const totalComments = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalComments / limit);

    // Get replies for each top-level comment
    const comments = await Promise.all(
      commentsResult.rows.map(async (comment) => {
        const replies = await getCommentReplies(comment.id, userId);
        return {
          id: comment.id,
          content: comment.content,
          authorId: comment.author_id,
          postId: comment.post_id,
          parentId: comment.parent_id,
          isEdited: comment.is_edited,
          editedAt: comment.edited_at,
          likeCount: comment.like_count,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          author: {
            username: comment.author_username,
            fullName: comment.author_full_name,
            avatarUrl: comment.author_avatar
          },
          isLiked: comment.is_liked || false,
          replyCount: parseInt(comment.reply_count),
          replies: replies.slice(0, 3) // Show only first 3 replies initially
        };
      })
    );

    res.json({
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error while fetching comments' });
  }
});

// Get replies for a specific comment
router.get('/:commentId/replies', optionalAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;

    const offset = (page - 1) * limit;

    // Check if comment exists
    const commentCheck = await db.query(
      'SELECT id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const replies = await getCommentReplies(commentId, userId, limit, offset);

    res.json({ replies });

  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ error: 'Server error while fetching replies' });
  }
});

// Update comment
router.put('/:id', auth, commentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;

    // Check if comment exists and user owns it
    const commentCheck = await db.query(
      'SELECT author_id, post_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['code', 'pre']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'code': ['class'],
        'pre': ['class']
      }
    });

    // Update comment
    await db.query(
      `UPDATE comments 
       SET content = $1, is_edited = true, edited_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [sanitizedContent, id]
    );

    const updatedComment = await getCommentWithDetails(id);

    // Emit real-time update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`post-${commentCheck.rows[0].post_id}`).emit('comment-updated', {
        comment: updatedComment,
        postId: commentCheck.rows[0].post_id
      });
    }

    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment
    });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Server error while updating comment' });
  }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists and user owns it or is admin
    const commentCheck = await db.query(
      'SELECT author_id, post_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    const postId = commentCheck.rows[0].post_id;

    // Delete comment and all its replies
    await deleteCommentAndReplies(id);

    // Decrement comment count on post
    await db.query(
      'UPDATE posts SET comment_count = comment_count - 1 WHERE id = $1',
      [postId]
    );

    // Emit real-time update via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`post-${postId}`).emit('comment-deleted', {
        commentId: id,
        postId: postId
      });
    }

    res.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error while deleting comment' });
  }
});

// Like/unlike comment
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists
    const commentCheck = await db.query(
      'SELECT id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if already liked
    const existingLike = await db.query(
      'SELECT id FROM likes WHERE user_id = $1 AND comment_id = $2',
      [req.user.id, id]
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await db.query(
        'DELETE FROM likes WHERE user_id = $1 AND comment_id = $2',
        [req.user.id, id]
      );

      await db.query(
        'UPDATE comments SET like_count = like_count - 1 WHERE id = $1',
        [id]
      );

      res.json({ message: 'Comment unliked', liked: false });
    } else {
      // Like
      await db.query(
        'INSERT INTO likes (user_id, comment_id) VALUES ($1, $2)',
        [req.user.id, id]
      );

      await db.query(
        'UPDATE comments SET like_count = like_count + 1 WHERE id = $1',
        [id]
      );

      res.json({ message: 'Comment liked', liked: true });
    }

  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Server error while liking comment' });
  }
});

// Helper function to get comment with details
async function getCommentWithDetails(commentId, userId = null) {
  const query = `
    SELECT c.*, 
           u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
           CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    LEFT JOIN likes l ON c.id = l.comment_id AND l.user_id = $2
    WHERE c.id = $1
  `;

  const result = await db.query(query, [commentId, userId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const comment = result.rows[0];
  return {
    id: comment.id,
    content: comment.content,
    authorId: comment.author_id,
    postId: comment.post_id,
    parentId: comment.parent_id,
    isEdited: comment.is_edited,
    editedAt: comment.edited_at,
    likeCount: comment.like_count,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    author: {
      username: comment.author_username,
      fullName: comment.author_full_name,
      avatarUrl: comment.author_avatar
    },
    isLiked: comment.is_liked || false
  };
}

// Helper function to get comment replies
async function getCommentReplies(commentId, userId = null, limit = 10, offset = 0) {
  const query = `
    SELECT c.*, 
           u.username as author_username, u.full_name as author_full_name, u.avatar_url as author_avatar,
           CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END as is_liked
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    LEFT JOIN likes l ON c.id = l.comment_id AND l.user_id = $3
    WHERE c.parent_id = $1
    ORDER BY c.created_at ASC
    LIMIT $2 OFFSET $4
  `;

  const result = await db.query(query, [commentId, limit, userId, offset]);
  
  return result.rows.map(comment => ({
    id: comment.id,
    content: comment.content,
    authorId: comment.author_id,
    postId: comment.post_id,
    parentId: comment.parent_id,
    isEdited: comment.is_edited,
    editedAt: comment.edited_at,
    likeCount: comment.like_count,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    author: {
      username: comment.author_username,
      fullName: comment.author_full_name,
      avatarUrl: comment.author_avatar
    },
    isLiked: comment.is_liked || false
  }));
}

// Helper function to delete comment and all its replies
async function deleteCommentAndReplies(commentId) {
  // First, delete all replies
  const replies = await db.query(
    'SELECT id FROM comments WHERE parent_id = $1',
    [commentId]
  );

  for (const reply of replies.rows) {
    await deleteCommentAndReplies(reply.id);
  }

  // Then delete the comment itself
  await db.query('DELETE FROM comments WHERE id = $1', [commentId]);
}

module.exports = router;


