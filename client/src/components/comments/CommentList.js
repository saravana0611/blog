import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { commentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import CommentForm from './CommentForm';
import { 
  HeartIcon, 
  ChatIcon, 
  TrashIcon, 
  PencilIcon,
  ReplyIcon
} from '@heroicons/react/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/solid';

const CommentList = ({ postId }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  // Fetch comments for the post
  const { data: comments, isLoading } = useQuery(
    ['comments', postId],
    () => commentsAPI.getByPost(postId),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Like comment mutation
  const likeMutation = useMutation(
    (commentId) => commentsAPI.like(commentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', postId]);
      },
      onError: () => {
        toast.error('Failed to like comment');
      },
    }
  );

  // Delete comment mutation
  const deleteMutation = useMutation(
    (commentId) => commentsAPI.delete(commentId),
    {
      onSuccess: () => {
        toast.success('Comment deleted successfully');
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['post', postId]);
      },
      onError: () => {
        toast.error('Failed to delete comment');
      },
    }
  );

  // Handle like
  const handleLike = (commentId) => {
    if (!isAuthenticated()) {
      toast.error('Please login to like comments');
      return;
    }
    likeMutation.mutate(commentId);
  };

  // Handle delete
  const handleDelete = (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteMutation.mutate(commentId);
    }
  };

  // Handle reply
  const handleReply = (commentId) => {
    if (!isAuthenticated()) {
      toast.error('Please login to reply to comments');
      return;
    }
    setReplyingTo(commentId);
  };

  // Handle edit
  const handleEdit = (comment) => {
    setEditingComment(comment);
  };

  // Cancel reply/edit
  const handleCancel = () => {
    setReplyingTo(null);
    setEditingComment(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading comments...</p>
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8">
        <ChatIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
        <p className="text-gray-600">Be the first to share your thoughts!</p>
      </div>
    );
  }

  const renderComment = (comment, level = 0) => {
    const canEdit = user?.id === comment.author?.id || user?.role === 'admin' || user?.role === 'moderator';
    const canDelete = user?.id === comment.author?.id || user?.role === 'admin' || user?.role === 'moderator';

    return (
      <div key={comment.id} className={`${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="flex space-x-3 mb-4">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            <img
              src={comment.author?.avatar || `https://ui-avatars.com/api/?name=${comment.author?.username}&background=random`}
              alt={comment.author?.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>

          {/* Comment Content */}
          <div className="flex-1">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.author?.full_name || comment.author?.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-gray-500">(edited)</span>
                  )}
                </div>

                {/* Comment Actions */}
                <div className="flex items-center space-x-2">
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(comment)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit comment"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete comment"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Comment Text */}
              <div className="text-gray-800 text-sm leading-relaxed">
                {comment.content}
              </div>
            </div>

            {/* Comment Actions */}
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <button
                onClick={() => handleLike(comment.id)}
                className={`flex items-center space-x-1 transition-colors ${
                  comment.is_liked
                    ? 'text-red-600'
                    : 'text-gray-500 hover:text-red-600'
                }`}
              >
                {comment.is_liked ? (
                  <HeartIconSolid className="h-4 w-4" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                <span>{comment.likes_count || 0}</span>
              </button>

              <button
                onClick={() => handleReply(comment.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ReplyIcon className="h-4 w-4" />
                <span>Reply</span>
              </button>
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-4">
                <CommentForm
                  postId={postId}
                  parentId={comment.id}
                  onSuccess={() => setReplyingTo(null)}
                  onCancel={handleCancel}
                />
              </div>
            )}

            {/* Edit Form */}
            {editingComment?.id === comment.id && (
              <div className="mt-4">
                <CommentEditForm
                  comment={comment}
                  onSuccess={() => setEditingComment(null)}
                  onCancel={handleCancel}
                />
              </div>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map((reply) => renderComment(reply, level + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {comments.map((comment) => renderComment(comment))}
    </div>
  );
};

// Comment Edit Form Component
const CommentEditForm = ({ comment, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState(comment.content);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await commentsAPI.update(comment.id, { content: content.trim() });
      toast.success('Comment updated successfully!');
      queryClient.invalidateQueries(['comments', comment.post_id]);
      onSuccess();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update comment';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Edit your comment..."
        />
        
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isSubmitting ? 'Updating...' : 'Update Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentList;











