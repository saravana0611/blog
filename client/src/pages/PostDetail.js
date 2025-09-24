import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { postsAPI, commentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CommentList from '../components/comments/CommentList';
import CommentForm from '../components/comments/CommentForm';
import { 
  HeartIcon, 
  BookmarkIcon, 
  ShareIcon, 
  EyeIcon,
  ChatIcon,
  ClockIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid 
} from '@heroicons/react/solid';

const PostDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(true);

  // Fetch post data
  const { data: post, isLoading, error } = useQuery(
    ['post', slug],
    () => postsAPI.getBySlug(slug),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Like post mutation
  const likeMutation = useMutation(
    () => postsAPI.like(post.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['post', slug]);
        queryClient.invalidateQueries('posts');
      },
      onError: () => {
        toast.error('Failed to like post');
      },
    }
  );

  // Bookmark post mutation
  const bookmarkMutation = useMutation(
    () => postsAPI.bookmark(post.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['post', slug]);
        queryClient.invalidateQueries('posts');
      },
      onError: () => {
        toast.error('Failed to bookmark post');
      },
    }
  );

  // Handle like
  const handleLike = () => {
    if (!isAuthenticated()) {
      toast.error('Please login to like posts');
      navigate('/login');
      return;
    }
    likeMutation.mutate();
  };

  // Handle bookmark
  const handleBookmark = () => {
    if (!isAuthenticated()) {
      toast.error('Please login to bookmark posts');
      navigate('/login');
      return;
    }
    bookmarkMutation.mutate();
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
          <p className="text-gray-600 mb-4">
            {error.response?.status === 404 
              ? 'The post you are looking for does not exist.'
              : 'Something went wrong while loading the post.'
            }
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return <LoadingSpinner />;
  }

  const {
    id,
    title,
    content,
    excerpt,
    featured_image,
    author,
    category,
    tags,
    likes_count,
    comments_count,
    views_count,
    created_at,
    updated_at,
    is_liked,
    is_bookmarked,
    reading_time
  } = post;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {featured_image && (
        <div className="w-full h-64 md:h-96 bg-gray-200">
          <img
            src={featured_image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Post Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          {/* Category and Tags */}
          <div className="flex items-center gap-2 mb-4">
            {category && (
              <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                {category.name}
              </span>
            )}
            {tags?.map((tag) => (
              <span
                key={tag.id}
                className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full font-medium hover:bg-gray-200 transition-colors cursor-pointer"
              >
                #{tag.name}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {title}
          </h1>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              {excerpt}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              {/* Author */}
              <div className="flex items-center space-x-2">
                <img
                  src={author?.avatar || `https://ui-avatars.com/api/?name=${author?.username}&background=random`}
                  alt={author?.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <button
                    onClick={() => navigate(`/user/${author?.username}`)}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {author?.full_name || author?.username}
                  </button>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <ClockIcon className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(created_at), { addSuffix: true })}</span>
                    {updated_at !== created_at && (
                      <>
                        <span>•</span>
                        <span>Updated {formatDistanceToNow(new Date(updated_at), { addSuffix: true })}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <EyeIcon className="h-4 w-4" />
                <span>{views_count || 0} views</span>
              </div>
              {reading_time && (
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>{reading_time} min read</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  is_liked
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {is_liked ? (
                  <HeartIconSolid className="h-5 w-5" />
                ) : (
                  <HeartIcon className="h-5 w-5" />
                )}
                <span className="font-medium">{likes_count || 0}</span>
              </button>

              {/* Comment Toggle */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <ChatIcon className="h-5 w-5" />
                <span className="font-medium">{comments_count || 0}</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <ShareIcon className="h-5 w-5" />
                <span className="font-medium">Share</span>
              </button>
            </div>

            {/* Bookmark Button */}
            <button
              onClick={handleBookmark}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                is_bookmarked
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {is_bookmarked ? (
                <BookmarkIconSolid className="h-5 w-5" />
              ) : (
                <BookmarkIcon className="h-5 w-5" />
              )}
              <span className="font-medium">
                {is_bookmarked ? 'Saved' : 'Save'}
              </span>
            </button>
          </div>
        </div>

        {/* Post Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="prose prose-lg max-w-none">
            {/* Render Markdown content here */}
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {content}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Comments ({comments_count || 0})
            </h2>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {showComments ? 'Hide Comments' : 'Show Comments'}
            </button>
          </div>

          {showComments && (
            <>
              {/* Comment Form */}
              {isAuthenticated() && (
                <CommentForm postId={id} />
              )}

              {/* Comment List */}
              <CommentList postId={id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;











