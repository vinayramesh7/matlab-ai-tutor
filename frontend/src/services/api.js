import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Helper for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();

  if (!token && !endpoint.includes('/health')) {
    throw new Error('Not authenticated. Please log in again.');
  }

  // Add timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
};

// Course API
export const courseAPI = {
  getAll: () => apiRequest('/courses'),

  getById: (id) => apiRequest(`/courses/${id}`),

  create: (courseData) => apiRequest('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  }),

  update: (id, courseData) => apiRequest(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(courseData),
  }),

  delete: (id) => apiRequest(`/courses/${id}`, {
    method: 'DELETE',
  }),
};

// Chat API
export const chatAPI = {
  sendMessage: (courseId, message, conversationHistory = []) =>
    apiRequest('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        message,
        conversation_history: conversationHistory,
      }),
    }),

  getHistory: (courseId) => apiRequest(`/chat/history/${courseId}`),

  clearHistory: (courseId) => apiRequest(`/chat/history/${courseId}`, {
    method: 'DELETE',
  }),
};

// PDF API
export const pdfAPI = {
  upload: async (courseId, file) => {
    const token = await getAuthToken();

    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('course_id', courseId);

    // Add timeout for long uploads
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/pdfs/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try a smaller PDF or check your connection.');
      }
      throw error;
    }
  },

  getAll: (courseId) => apiRequest(`/pdfs/${courseId}`),

  delete: (id) => apiRequest(`/pdfs/${id}`, {
    method: 'DELETE',
  }),
};

// Link API
export const linkAPI = {
  getAll: (courseId) => apiRequest(`/links/${courseId}`),

  add: (courseId, linkData) => apiRequest('/links', {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId,
      ...linkData,
    }),
  }),

  delete: (id) => apiRequest(`/links/${id}`, {
    method: 'DELETE',
  }),
};
