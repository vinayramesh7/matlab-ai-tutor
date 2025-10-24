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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
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
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('course_id', courseId);

    const response = await fetch(`${API_BASE_URL}/pdfs/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  getAll: (courseId) => apiRequest(`/pdfs/${courseId}`),

  delete: (id) => apiRequest(`/pdfs/${id}`, {
    method: 'DELETE',
  }),
};
