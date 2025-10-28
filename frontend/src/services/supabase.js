import { createClient } from '@supabase/supabase-js';
import { clearTokenCache } from './api.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log environment variables (remove in production)
console.log('🔑 Supabase URL loaded:', supabaseUrl ? '✅ YES' : '❌ NO');
console.log('🔑 Supabase Key loaded:', supabaseAnonKey ? '✅ YES' : '❌ NO');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'EXISTS' : 'MISSING');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signUp = async (email, password, fullName, role = 'student') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      }
    }
  });

  if (error) throw error;

  // Create profile
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      role: role
    });
  }

  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  console.log('🚪 Signing out...');

  // Clear token cache
  clearTokenCache();

  // Clear all Supabase data from localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('sb-')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    console.log('🗑️ Removing:', key);
    localStorage.removeItem(key);
  });

  // Clear sessionStorage too
  sessionStorage.clear();

  console.log('✅ Sign out complete - reloading page');

  // Try to call Supabase signOut but don't wait for it (it hangs)
  supabase.auth.signOut().catch(err => {
    console.warn('⚠️ Supabase signOut failed (ignored):', err);
  });

  // Force reload to /login to ensure clean state
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // If no profile found, return null instead of throwing
  if (error && error.code === 'PGRST116') {
    console.warn('No profile found for user:', userId);
    return null;
  }

  if (error) throw error;
  return data;
};
