import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { HeartIcon, ChatIcon, BookmarkIcon, EyeIcon } from '@heroicons/react/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/solid';

const PostCard = ({ post }) => {
  const {
    id,
    title,
    slug,
    excerpt,
    content,
    featured_image,
    author,
    category,
    tags,
    likes_count,
    comments_count,
    views_count,
    created_at,
    is_liked,
    is_bookmarked,
    reading_time
  } = post;

  const formatExcerpt = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <article className="post-card">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Featured Image */}
        {featured_image && (
          <div className="lg:w-1/3">
            <img
              src={featured_image}
              alt={title}
              className="w-full h-48 lg:h-32 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          {/* Category and Tags */}
          <div className="flex items-center gap-2 mb-3">
            {category && (
              <Link
                to={`/search?category=${category.slug}`}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium hover:bg-blue-200 transition-colors"
              >
                {category.name}
              </Link>
            )}
            {tags?.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                to={`/search?tag=${tag.name}`}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium hover:bg-gray-200 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
            <Link to={`/post/${slug}`}>
              {title}
            </Link>
          </h2>

          {/* Excerpt */}
          <p className="text-gray-600 mb-4 leading-relaxed">
            {formatExcerpt(excerpt || content)}
          </p>

          {/* Meta Information */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Author */}
              <div className="flex items-center space-x-2">
                <img
                  src={author?.avatar || `https://ui-avatars.com/api/?name=${author?.username}&background=random`}
                  alt={author?.username}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <Link
                  to={`/user/${author?.username}`}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {author?.username}
                </Link>
              </div>

              {/* Time */}
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
              </span>

              {/* Reading Time */}
              {reading_time && (
                <span className="text-sm text-gray-500">
                  {reading_time} min read
                </span>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <EyeIcon className="h-4 w-4" />
                <span>{views_count || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <ChatIcon className="h-4 w-4" />
                <span>{comments_count || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                {is_liked ? (
                  <HeartIconSolid className="h-4 w-4 text-red-500" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                <span>{likes_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;











