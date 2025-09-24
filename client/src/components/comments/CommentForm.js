import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { commentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { UserIcon } from '@heroicons/react/outline';

const CommentForm = ({ postId, parentId = null, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      content: '',
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation(
    (commentData) => commentsAPI.create(commentData),
    {
      onSuccess: (data) => {
        toast.success('Comment posted successfully!');
        reset();
        
        // Invalidate relevant queries
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['post', postId]);
        
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to post comment';
        toast.error(message);
      },
    }
  );

  const onSubmit = async (data) => {
    if (!data.content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData = {
        post_id: postId,
        content: data.content.trim(),
        parent_id: parentId,
      };

      await createCommentMutation.mutateAsync(commentData);
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex space-x-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=random`}
            alt={user?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        </div>

        {/* Comment Form */}
        <div className="flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <textarea
                {...register('content', {
                  required: 'Comment content is required',
                  minLength: {
                    value: 1,
                    message: 'Comment must not be empty',
                  },
                  maxLength: {
                    value: 1000,
                    message: 'Comment must be less than 1000 characters',
                  },
                })}
                rows={3}
                placeholder={parentId ? 'Write a reply...' : 'Write a comment...'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.content ? 'border-red-300' : ''
                }`}
                disabled={isSubmitting}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {parentId ? 'Replying to comment' : 'Posting as @' + user?.username}
              </div>
              
              <div className="flex items-center space-x-3">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isSubmitting
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Post Comment'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentForm;











