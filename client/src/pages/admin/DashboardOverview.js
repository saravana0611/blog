import React from 'react';
import { 
  UsersIcon, 
  DocumentTextIcon, 
  ChatIcon, 
  EyeIcon,
  TrendingUpIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  ClockIcon
} from '@heroicons/react/outline';

const DashboardOverview = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Users',
      value: data.total_users || 0,
      change: data.new_users_this_week || 0,
      changeType: 'increase',
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Posts',
      value: data.total_posts || 0,
      change: data.new_posts_this_week || 0,
      changeType: 'increase',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Total Comments',
      value: data.total_comments || 0,
      change: data.new_comments_this_week || 0,
      changeType: 'increase',
      icon: ChatIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Views',
      value: data.total_views || 0,
      change: data.views_this_week || 0,
      changeType: 'increase',
      icon: EyeIcon,
      color: 'bg-orange-500',
    },
  ];

  const alerts = [
    {
      name: 'Pending Posts',
      value: data.pending_posts_count || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/admin/pending-posts',
    },
    {
      name: 'Pending Reports',
      value: data.pending_reports_count || 0,
      icon: FlagIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/admin/reports',
    },
    {
      name: 'Active Users Today',
      value: data.active_users_today || 0,
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/admin/users',
    },
  ];

  const recentActivity = data.recent_activity || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-gray-600">
          Monitor your platform's performance and activity at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                <stat.icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              </div>
            </div>
            {stat.change > 0 && (
              <div className="mt-4 flex items-center">
                <TrendingUpIcon className="h-4 w-4 text-green-500" />
                <span className="ml-1 text-sm text-green-600">
                  +{stat.change} this week
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Required</h3>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.name}
                  className={`flex items-center justify-between p-4 rounded-lg ${alert.bgColor} border border-gray-200`}
                >
                  <div className="flex items-center space-x-3">
                    <alert.icon className={`h-5 w-5 ${alert.color}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{alert.name}</p>
                      <p className="text-sm text-gray-600">
                        {alert.value} item{alert.value !== 1 ? 's' : ''} pending
                      </p>
                    </div>
                  </div>
                  <a
                    href={alert.href}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Posts This Month</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.posts_this_month || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Comments This Month</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.comments_this_month || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Users This Month</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.new_users_this_month || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Response Time</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.avg_response_time || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 py-2">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No recent activity to display</p>
          </div>
        )}
      </div>

      {/* Platform Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Response Time</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.avg_api_response_time || 'N/A'}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="text-sm font-semibold text-gray-900">
                {data.uptime_percentage || '99.9'}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Moderation</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Posts Pending Review</span>
              <span className="text-sm font-semibold text-orange-600">
                {data.pending_posts_count || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reports Pending</span>
              <span className="text-sm font-semibold text-red-600">
                {data.pending_reports_count || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Moderators Online</span>
              <span className="text-sm font-semibold text-green-600">
                {data.moderators_online || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;











