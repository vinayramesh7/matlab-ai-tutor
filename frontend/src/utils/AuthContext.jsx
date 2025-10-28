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

        // Validate localStorage session first
        let hasValidLocalSession = false;
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('sb-') && key.includes('-auth-token')) {
              const storageSession = localStorage.getItem(key);
              const parsed = JSON.parse(storageSession);
              const expiresAt = parsed?.expires_at;

              // Check if token is expired
              if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000)) {
                console.warn('⚠️ Expired session in localStorage - clearing');
                localStorage.removeItem(key);
              } else if (parsed?.access_token) {
                hasValidLocalSession = true;
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ localStorage validation failed:', err.message);
        }

        // If no valid local session, clear everything and return
        if (!hasValidLocalSession) {
          console.log('👤 No valid local session');
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Now try to get session from Supabase with timeout
        let session = null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);

          const result = await supabase.auth.getSession();
          clearTimeout(timeout);

          if (result?.error) {
            console.error('❌ Session error:', result.error);
            throw result.error;
          }

          session = result?.data?.session;
        } catch (err) {
          console.error('❌ getSession failed:', err.message);
          // Clear everything on error
          await supabase.auth.signOut();
          // Aggressive cleanup
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.includes('sb-')) {
              localStorage.removeItem(key);
            }
          }
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (!session) {
          console.log('👤 No active session');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('👤 Current user:', session.user.email);
        setUser(session.user);

        // Get profile
        const userProfile = await getProfile(session.user.id);
        console.log('📋 User profile:', userProfile);
        setProfile(userProfile);
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        // Clear everything on error
        await supabase.auth.signOut();
        // Aggressive cleanup of localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        }
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
