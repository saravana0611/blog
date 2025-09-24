import React from 'react';

const CategoryFilter = ({ selectedCategory, onCategoryChange }) => {
  const categories = [
    { id: 'all', name: 'All Categories', slug: 'all' },
    { id: 'programming', name: 'Programming', slug: 'programming' },
    { id: 'web-development', name: 'Web Development', slug: 'web-development' },
    { id: 'mobile-development', name: 'Mobile Development', slug: 'mobile-development' },
    { id: 'data-science', name: 'Data Science', slug: 'data-science' },
    { id: 'ai-ml', name: 'AI & Machine Learning', slug: 'ai-ml' },
    { id: 'devops', name: 'DevOps', slug: 'devops' },
    { id: 'cybersecurity', name: 'Cybersecurity', slug: 'cybersecurity' },
    { id: 'cloud-computing', name: 'Cloud Computing', slug: 'cloud-computing' },
    { id: 'blockchain', name: 'Blockchain', slug: 'blockchain' },
    { id: 'gaming', name: 'Game Development', slug: 'gaming' },
    { id: 'other', name: 'Other', slug: 'other' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.slug)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === category.slug
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;











