import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { postsAPI, uploadAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/outline';

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      category: '',
      tags: '',
      featured_image: null,
    },
  });

  // Fetch categories for the dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery(
    'categories',
    async () => {
      // This would typically come from your API
      return [
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
        { id: 'other', name: 'Other', slug: 'other' },
      ];
    }
  );

  // Create post mutation
  const createPostMutation = useMutation(
    (postData) => postsAPI.create(postData),
    {
      onSuccess: (data) => {
        toast.success('Post created successfully!');
        queryClient.invalidateQueries('posts');
        navigate(`/post/${data.slug}`);
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create post';
        toast.error(message);
      },
    }
  );

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadAPI.uploadImage(formData);
      setValue('featured_image', response.data.filename);
      setSelectedImage(response.data.filename);
      setImagePreview(URL.createObjectURL(file));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      handleImageUpload(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setValue('featured_image', null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // Process tags from comma-separated string to array
      const processedData = {
        ...data,
        tags: data.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
        featured_image: selectedImage,
      };

      await createPostMutation.mutateAsync(processedData);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  // Auto-generate excerpt from content
  const handleContentChange = (e) => {
    const content = e.target.value;
    setValue('content', content);
    
    // Auto-generate excerpt if empty
    if (!watch('excerpt')) {
      const excerpt = content.substring(0, 150).trim();
      if (excerpt.length === 150) {
        setValue('excerpt', excerpt + '...');
      } else {
        setValue('excerpt', excerpt);
      }
    }
  };

  if (categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
          <p className="mt-2 text-gray-600">
            Share your technical thoughts and insights with the community.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Post Title *
            </label>
            <input
              type="text"
              id="title"
              {...register('title', {
                required: 'Title is required',
                minLength: {
                  value: 10,
                  message: 'Title must be at least 10 characters',
                },
                maxLength: {
                  value: 200,
                  message: 'Title must be less than 200 characters',
                },
              })}
              className={`input-field text-lg ${errors.title ? 'border-red-300' : ''}`}
              placeholder="Enter your post title..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Category and Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                {...register('category', { required: 'Category is required' })}
                className={`input-field ${errors.category ? 'border-red-300' : ''}`}
              >
                <option value="">Select a category</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                {...register('tags')}
                className="input-field"
                placeholder="Enter tags separated by commas..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple tags with commas (e.g., javascript, react, web-development)
              </p>
            </div>
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image
            </label>
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <span className="btn-primary">
                      {isUploading ? 'Uploading...' : 'Upload Image'}
                    </span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <p className="mt-2 text-sm text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              {...register('excerpt', {
                maxLength: {
                  value: 300,
                  message: 'Excerpt must be less than 300 characters',
                },
              })}
              rows={3}
              className={`input-field ${errors.excerpt ? 'border-red-300' : ''}`}
              placeholder="Brief description of your post (auto-generated from content if left empty)..."
            />
            {errors.excerpt && (
              <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {watch('excerpt')?.length || 0}/300 characters
            </p>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              id="content"
              {...register('content', {
                required: 'Content is required',
                minLength: {
                  value: 100,
                  message: 'Content must be at least 100 characters',
                },
              })}
              rows={15}
              className={`input-field font-mono text-sm ${errors.content ? 'border-red-300' : ''}`}
              placeholder="Write your post content here... You can use Markdown formatting."
              onChange={handleContentChange}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {watch('content')?.length || 0} characters (minimum 100)
            </p>
          </div>

          {/* Markdown Preview Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-preview"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="show-preview" className="text-sm font-medium text-gray-700">
              Show Markdown Preview
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className={`btn-primary ${
                isSubmitting || isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Creating Post...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;











