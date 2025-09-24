import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DashboardOverview from './DashboardOverview';
import PendingPosts from './PendingPosts';
import UserReports from './UserReports';
import UserManagement from './UserManagement';
import SystemSettings from './SystemSettings';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  FlagIcon, 
  UsersIcon, 
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/outline';

const AdminDashboard = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch admin dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    'adminDashboard',
    adminAPI.getDashboard,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const navigation = [
    { name: 'Overview', href: '/admin', icon: ChartBarIcon, current: location.pathname === '/admin' },
    { name: 'Pending Posts', href: '/admin/pending-posts', icon: DocumentTextIcon, current: location.pathname === '/admin/pending-posts' },
    { name: 'User Reports', href: '/admin/reports', icon: FlagIcon, current: location.pathname === '/admin/reports' },
    { name: 'User Management', href: '/admin/users', icon: UsersIcon, current: location.pathname === '/admin/users' },
    { name: 'System Settings', href: '/admin/settings', icon: CogIcon, current: location.pathname === '/admin/settings' },
  ];

  if (dashboardLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6">
              {dashboardData && (
                <>
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-gray-600">
                      {dashboardData.pending_posts_count || 0} pending posts
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FlagIcon className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-gray-600">
                      {dashboardData.pending_reports_count || 0} pending reports
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to="/admin/pending-posts"
                  className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Review Pending Posts
                </Link>
                <Link
                  to="/admin/reports"
                  className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Handle User Reports
                </Link>
                <Link
                  to="/admin/users"
                  className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Manage Users
                </Link>
              </div>
            </div>

            {/* System Status */}
            {dashboardData && (
              <div className="mt-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Users:</span>
                    <span className="font-medium">{dashboardData.total_users || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Posts:</span>
                    <span className="font-medium">{dashboardData.total_posts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Today:</span>
                    <span className="font-medium">{dashboardData.active_users_today || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<DashboardOverview data={dashboardData} />} />
              <Route path="/pending-posts" element={<PendingPosts />} />
              <Route path="/reports" element={<UserReports />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/settings" element={<SystemSettings />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;











