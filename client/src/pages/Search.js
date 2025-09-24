import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { toast } from 'react-hot-toast';
import { searchAPI, postsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PostCard from '../components/posts/PostCard';
import { 
  SearchIcon, 
  FilterIcon, 
  TrendingUpIcon,
  UserIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/outline';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);

  // Get search query from URL params
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const sort = searchParams.get('sort') || 'relevance';
  const category = searchParams.get('category') || '';

  // Update local state when URL params change
  useEffect(() => {
    setSearchQuery(query);
    setSearchType(type);
    setSortBy(sort);
  }, [query, type, sort]);

  // Update URL when search parameters change
  const updateSearchParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      updateSearchParams({
        q: searchQuery.trim(),
        type: searchType,
        sort: sortBy,
        category: category || undefined
      });
    }
  };

  // Handle search type change
  const handleTypeChange = (newType) => {
    setSearchType(newType);
    updateSearchParams({ type: newType });
  };

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    updateSearchParams({ sort: newSort });
  };

  // Handle category change
  const handleCategoryChange = (newCategory) => {
    updateSearchParams({ category: newCategory || undefined });
  };

  // Fetch search results
  const { data: searchResults, isLoading: searchLoading } = useQuery(
    ['search', query, type, sort, category],
    () => searchAPI.search(query, { type, sort, category }),
    {
      enabled: !!query.trim(),
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fetch search suggestions
  const { data: suggestions } = useQuery(
    ['searchSuggestions', query],
    () => searchAPI.getSuggestions(query),
    {
      enabled: !!query.trim() && query.length > 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch trending searches
  const { data: trendingSearches } = useQuery(
    'trendingSearches',
    searchAPI.getTrending,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    updateSearchParams({ q: suggestion });
  };

  // Handle trending search click
  const handleTrendingClick = (trending) => {
    setSearchQuery(trending.query);
    updateSearchParams({ q: trending.query });
  };

  const searchTypes = [
    { id: 'all', name: 'All', icon: SearchIcon },
    { id: 'posts', name: 'Posts', icon: DocumentTextIcon },
    { id: 'users', name: 'Users', icon: UserIcon },
    { id: 'tags', name: 'Tags', icon: TagIcon },
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'latest', label: 'Latest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'trending', label: 'Trending' },
  ];

  const categories = [
    { id: '', name: 'All Categories' },
    { id: 'programming', name: 'Programming' },
    { id: 'web-development', name: 'Web Development' },
    { id: 'mobile-development', name: 'Mobile Development' },
    { id: 'data-science', name: 'Data Science' },
    { id: 'ai-ml', name: 'AI & Machine Learning' },
    { id: 'devops', name: 'DevOps' },
    { id: 'cybersecurity', name: 'Cybersecurity' },
    { id: 'cloud-computing', name: 'Cloud Computing' },
    { id: 'blockchain', name: 'Blockchain' },
    { id: 'gaming', name: 'Game Development' },
    { id: 'other', name: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search</h1>
          <p className="text-gray-600">
            Find posts, users, tags, and discussions across the platform.
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for posts, users, tags, or discussions..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>

            {/* Search Options */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Type */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {searchTypes.map((typeOption) => (
                    <button
                      key={typeOption.id}
                      type="button"
                      onClick={() => handleTypeChange(typeOption.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        searchType === typeOption.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <typeOption.icon className="h-4 w-4" />
                      {typeOption.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div className="sm:w-48">
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                <FilterIcon className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Advanced Filters
              </button>

              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Search Results */}
        {query && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results for "{query}"
              </h2>
              {searchResults && (
                <span className="text-gray-600">
                  {searchResults.total || 0} results found
                </span>
              )}
            </div>

            {searchLoading ? (
              <LoadingSpinner />
            ) : searchResults?.results?.length > 0 ? (
              <div className="space-y-6">
                {searchResults.results.map((result) => {
                  if (result.type === 'post') {
                    return <PostCard key={result.id} post={result} />;
                  }
                  if (result.type === 'user') {
                    return (
                      <div
                        key={result.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/user/${result.username}`)}
                      >
                        <div className="flex items-center space-x-4">
                          <img
                            src={result.avatar || `https://ui-avatars.com/api/?name=${result.username}&background=random`}
                            alt={result.username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900">
                              {result.full_name || result.username}
                            </h3>
                            <p className="text-gray-600">@{result.username}</p>
                            {result.bio && (
                              <p className="text-gray-700 mt-2">{result.bio}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (result.type === 'tag') {
                    return (
                      <div
                        key={result.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/search?q=${result.name}&type=posts`)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              #{result.name}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              {result.posts_count || 0} posts
                            </p>
                          </div>
                          <TagIcon className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <SearchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-secondary"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search Suggestions */}
        {!query && suggestions?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Suggestions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-gray-700">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Searches */}
        {!query && trendingSearches?.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUpIcon className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">Trending Searches</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendingSearches.slice(0, 6).map((trending) => (
                <button
                  key={trending.id}
                  onClick={() => handleTrendingClick(trending)}
                  className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{trending.query}</span>
                    <span className="text-xs text-orange-600 font-medium">
                      {trending.count} searches
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches (if any) */}
        {!query && (
          <div className="text-center py-12">
            <SearchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Searching</h3>
            <p className="text-gray-600">
              Enter a search term above to find posts, users, tags, and discussions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;











