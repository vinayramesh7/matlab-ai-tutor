import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, getProfile } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const initAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');

        // Get session directly from localStorage - don't call getSession() as it hangs
        let sessionData = null;
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('sb-') && key.includes('-auth-token')) {
              const storageSession = localStorage.getItem(key);
              const parsed = JSON.parse(storageSession);
              const expiresAt = parsed?.expires_at;
              const token = parsed?.access_token;
              const user = parsed?.user;

              // Check if token is expired
              if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000)) {
                console.warn('⚠️ Expired session in localStorage - clearing');
                localStorage.removeItem(key);
              } else if (token && user && expiresAt) {
                console.log('✅ Found valid session in localStorage');
                sessionData = { token, user, expiresAt };
                break;
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ localStorage validation failed:', err.message);
        }

        // If no valid session found, clear state
        if (!sessionData) {
          console.log('👤 No valid session found');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('👤 User from localStorage:', sessionData.user.email);
        setUser(sessionData.user);

        // Get profile
        try {
          const userProfile = await getProfile(sessionData.user.id);
          console.log('📋 User profile loaded:', userProfile);
          setProfile(userProfile);
        } catch (profileErr) {
          console.error('❌ Failed to load profile:', profileErr);
          setProfile(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setUser(null);
        setProfile(null);
      } finally {
        console.log('✅ Auth initialization complete');
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const userProfile = await getProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isProfessor: profile?.role === 'professor',
    isStudent: profile?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
