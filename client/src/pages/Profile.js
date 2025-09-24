import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { usersAPI, postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PostCard from '../components/posts/PostCard';
import { 
  UserIcon, 
  CalendarIcon, 
  MapPinIcon, 
  LinkIcon,
  HeartIcon,
  BookmarkIcon,
  EyeIcon,
  ChatIcon
} from '@heroicons/react/outline';
import { 
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/solid';

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('posts');

  // Check if viewing own profile
  const isOwnProfile = currentUser?.username === username;

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery(
    ['profile', username],
    () => usersAPI.getProfile(username),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch user posts
  const { data: posts, isLoading: postsLoading } = useQuery(
    ['userPosts', username],
    () => usersAPI.getPosts(username, { limit: 20 }),
    {
      enabled: !!profile,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fetch user followers
  const { data: followers, isLoading: followersLoading } = useQuery(
    ['userFollowers', username],
    () => usersAPI.getFollowers(username),
    {
      enabled: !!profile && activeTab === 'followers',
      staleTime: 2 * 60 * 1000,
    }
  );

  // Fetch user following
  const { data: following, isLoading: followingLoading } = useQuery(
    ['userFollowing', username],
    () => usersAPI.getFollowing(username),
    {
      enabled: !!profile && activeTab === 'following',
      staleTime: 2 * 60 * 1000,
    }
  );

  // Follow/Unfollow mutation
  const followMutation = useMutation(
    () => usersAPI.follow(username),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', username]);
        queryClient.invalidateQueries(['userFollowers', username]);
        toast.success(`You are now following ${username}`);
      },
      onError: () => {
        toast.error('Failed to follow user');
      },
    }
  );

  const unfollowMutation = useMutation(
    () => usersAPI.unfollow(username),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', username]);
        queryClient.invalidateQueries(['userFollowers', username]);
        toast.success(`You unfollowed ${username}`);
      },
      onError: () => {
        toast.error('Failed to unfollow user');
      },
    }
  );

  // Handle follow/unfollow
  const handleFollowToggle = () => {
    if (!isAuthenticated()) {
      toast.error('Please login to follow users');
      navigate('/login');
      return;
    }

    if (profile?.is_following) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (profileLoading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User not found</h2>
          <p className="text-gray-600 mb-4">
            The user you are looking for does not exist.
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

  const {
    id,
    username: profileUsername,
    full_name,
    email,
    avatar,
    bio,
    location,
    website,
    created_at,
    followers_count,
    following_count,
    posts_count,
    is_following,
    role
  } = profile;

  const tabs = [
    { id: 'posts', name: 'Posts', count: posts_count, icon: ChatIcon },
    { id: 'followers', name: 'Followers', count: followers_count, icon: HeartIcon },
    { id: 'following', name: 'Following', count: following_count, icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={avatar || `https://ui-avatars.com/api/?name=${full_name || username}&background=random&size=128`}
                alt={full_name || username}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {full_name || username}
                  </h1>
                  <p className="text-lg text-gray-600">@{username}</p>
                  
                  {/* Bio */}
                  {bio && (
                    <p className="mt-2 text-gray-700 max-w-2xl">
                      {bio}
                    </p>
                  )}

                  {/* Profile Details */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {location && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{location}</span>
                      </div>
                    )}
                    
                    {website && (
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-4 w-4" />
                        <a
                          href={website.startsWith('http') ? website : `https://${website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {website}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Joined {formatDistanceToNow(new Date(created_at), { addSuffix: true })}</span>
                    </div>

                    {role && role !== 'user' && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {role === 'admin' ? 'Administrator' : 'Moderator'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isOwnProfile && isAuthenticated() && (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followMutation.isLoading || unfollowMutation.isLoading}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        is_following
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {followMutation.isLoading || unfollowMutation.isLoading
                        ? 'Loading...'
                        : is_following
                        ? 'Unfollow'
                        : 'Follow'
                      }
                    </button>
                  )}

                  {isOwnProfile && (
                    <button
                      onClick={() => navigate('/profile/edit')}
                      className="btn-secondary"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 flex items-center gap-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.count || 0}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Posts by {full_name || username}</h2>
              
              {postsLoading ? (
                <LoadingSpinner />
              ) : posts?.length > 0 ? (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <ChatIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-600">
                    {isOwnProfile 
                      ? "You haven't created any posts yet. Start sharing your thoughts!"
                      : `${full_name || username} hasn't created any posts yet.`
                    }
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => navigate('/create-post')}
                      className="btn-primary mt-4"
                    >
                      Create Your First Post
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Followers Tab */}
          {activeTab === 'followers' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Followers</h2>
              
              {followersLoading ? (
                <LoadingSpinner />
              ) : followers?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followers.map((follower) => (
                    <div
                      key={follower.id}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/user/${follower.username}`)}
                    >
                      <img
                        src={follower.avatar || `https://ui-avatars.com/api/?name=${follower.username}&background=random`}
                        alt={follower.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {follower.full_name || follower.username}
                        </p>
                        <p className="text-sm text-gray-500">@{follower.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <HeartIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No followers yet</h3>
                  <p className="text-gray-600">
                    {isOwnProfile 
                      ? "Start creating content to attract followers!"
                      : `${full_name || username} doesn't have any followers yet.`
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Following Tab */}
          {activeTab === 'following' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Following</h2>
              
              {followingLoading ? (
                <LoadingSpinner />
              ) : following?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {following.map((followed) => (
                    <div
                      key={followed.id}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/user/${followed.username}`)}
                    >
                      <img
                        src={followed.avatar || `https://ui-avatars.com/api/?name=${followed.username}&background=random`}
                        alt={followed.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {followed.full_name || followed.username}
                        </p>
                        <p className="text-sm text-gray-500">@{followed.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <UserIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Not following anyone yet</h3>
                  <p className="text-gray-600">
                    {isOwnProfile 
                      ? "Start following other users to see their posts in your feed!"
                      : `${full_name || username} isn't following anyone yet.`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;











