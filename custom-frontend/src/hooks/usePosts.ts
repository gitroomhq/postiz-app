import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { Post } from '@/types';

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPosts();
      setPosts(response.posts || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const createPost = async (data: Partial<Post>) => {
    try {
      const newPost = await apiClient.createPost(data);
      setPosts((prev) => [newPost, ...prev]);
      return newPost;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create post');
    }
  };

  const deletePost = async (id: string) => {
    try {
      await apiClient.deletePost(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete post');
    }
  };

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    deletePost,
  };
}
