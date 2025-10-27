import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth token with timeout
const getAuthToken = async () => {
  console.log('🔐 Getting auth token...');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const result = await supabase.auth.getSession();
    clearTimeout(timeout);

    const token = result?.data?.session?.access_token;
    console.log('🔑 Token retrieved:', token ? '✅ Yes' : '❌ None');
    return token || null;
  } catch (err) {
    console.error('❌ getAuthToken error:', err.message);
    // If timeout or error, try to get from local storage directly
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('sb-') && key.includes('-auth-token')) {
        try {
          const storageSession = localStorage.getItem(key);
          const parsed = JSON.parse(storageSession);
          const token = parsed?.access_token;
          if (token) {
            console.log('🔑 Fallback token from storage:', '✅ Yes');
            return token;
          }
        } catch {
          continue;
        }
      }
    }
    console.log('🔑 No fallback token found');
    return null;
  }
};

// Helper for API requests
const apiRequest = async (endpoint, options = {}) => {
  console.log('🌐 API Request:', endpoint, options.method || 'GET');

  const token = await getAuthToken();
  console.log('🔑 Auth token:', token ? '✅ Present' : '❌ Missing');

  if (!token && !endpoint.includes('/health')) {
    console.error('❌ No auth token - user not authenticated');
    throw new Error('Not authenticated. Please log in again.');
  }

  // Add timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.error('⏱️ Request timeout after 30s');
    controller.abort();
  }, 30000); // 30 second timeout

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('📡 Fetching:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('❌ API Error:', error);
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API Success:', data);
    return data;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error('⏱️ Request aborted - timeout');
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    console.error('❌ API Request failed:', error);
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
