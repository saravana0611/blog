import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

// Posts API
export const postsAPI = {
  getAll: (params) => api.get('/posts', { params }),
  getBySlug: (slug) => api.get(`/posts/${slug}`),
  create: (postData) => api.post('/posts', postData),
  update: (id, postData) => api.put(`/posts/${id}`, postData),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  bookmark: (id) => api.post(`/posts/${id}/bookmark`),
  getTrending: () => api.get('/posts/trending'),
  getByCategory: (category) => api.get(`/posts/category/${category}`),
  getByTag: (tag) => api.get(`/posts/tag/${tag}`),
};

// Comments API
export const commentsAPI = {
  getByPost: (postId, params) => api.get(`/comments/post/${postId}`, { params }),
  create: (commentData) => api.post('/comments', commentData),
  update: (id, commentData) => api.put(`/comments/${id}`, commentData),
  delete: (id) => api.delete(`/comments/${id}`),
  like: (id) => api.post(`/comments/${id}/like`),
  getReplies: (commentId) => api.get(`/comments/${commentId}/replies`),
};

// Users API
export const usersAPI = {
  getProfile: (username) => api.get(`/users/profile/${username}`),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  follow: (username) => api.post(`/users/follow/${username}`),
  unfollow: (username) => api.delete(`/users/follow/${username}`),
  getFollowers: (username) => api.get(`/users/${username}/followers`),
  getFollowing: (username) => api.get(`/users/${username}/following`),
  getPosts: (username, params) => api.get(`/users/${username}/posts`, { params }),
  getBookmarks: () => api.get('/users/bookmarks'),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationRead: (id) => api.put(`/users/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/users/notifications/read-all'),
};

// Search API
export const searchAPI = {
  search: (query, params) => api.get('/search', { params: { q: query, ...params } }),
  getSuggestions: (query) => api.get('/search/suggestions', { params: { q: query } }),
  getTrending: () => api.get('/search/trending'),
  getAnalytics: () => api.get('/search/analytics'),
};

// Upload API
export const uploadAPI = {
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadImages: (formData) => api.post('/upload/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteImage: (filename) => api.delete(`/upload/image/${filename}`),
  getMyImages: () => api.get('/upload/my-images'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPendingPosts: () => api.get('/admin/posts/pending'),
  moderatePost: (id, action) => api.post(`/admin/posts/${id}/moderate`, { action }),
  getReports: () => api.get('/admin/reports'),
  resolveReport: (id, resolution) => api.post(`/admin/reports/${id}/resolve`, { resolution }),
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', settings),
};

export default api;











