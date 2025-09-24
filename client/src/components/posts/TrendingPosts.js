import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUpIcon } from '@heroicons/react/outline';

const TrendingPosts = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Posts</h3>
        <p className="text-gray-500 text-sm">No trending posts yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUpIcon className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Trending Posts</h3>
      </div>
      
      <div className="space-y-4">
        {posts.slice(0, 5).map((post, index) => (
          <div key={post.id} className="flex items-start gap-3">
            {/* Rank */}
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              index === 0 ? 'bg-yellow-500 text-white' :
              index === 1 ? 'bg-gray-400 text-white' :
              index === 2 ? 'bg-orange-600 text-white' :
              'bg-gray-200 text-gray-700'
            }`}>
              {index + 1}
            </div>
            
            {/* Post Info */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/post/${post.slug}`}
                className="block text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
              >
                {post.title}
              </Link>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{post.likes_count || 0} likes</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {posts.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            to="/search?sort=trending"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all trending posts →
          </Link>
        </div>
      )}
    </div>
  );
};

export default TrendingPosts;











