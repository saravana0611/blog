import React from 'react';

const PendingPosts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pending Posts</h2>
        <p className="mt-1 text-sm text-gray-600">
          Review and moderate posts that are waiting for approval.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-center text-gray-600 py-8">
          Pending Posts component - Content moderation functionality will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default PendingPosts;


