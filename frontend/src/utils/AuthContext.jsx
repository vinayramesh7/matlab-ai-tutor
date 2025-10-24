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
        const currentUser = await getCurrentUser();
        console.log('👤 Current user:', currentUser ? currentUser.email : 'None');
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await getProfile(currentUser.id);
          console.log('📋 User profile:', userProfile);
          setProfile(userProfile);
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
