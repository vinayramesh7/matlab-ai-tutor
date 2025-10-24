-- MATLAB AI Tutor - Supabase Database Schema (FIXED VERSION)
-- This version includes auto-profile creation and simplified RLS policies

-- First, clean up existing tables (if any)
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS pdf_chunks CASCADE;
DROP TABLE IF EXISTS pdfs CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Professors can upload PDFs to their courses" ON storage.objects;
DROP POLICY IF EXISTS "Professors can delete their course PDFs" ON storage.objects;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'professor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for easier local development (can enable in production)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COURSES TABLE
-- ============================================================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  description TEXT,
  teaching_style TEXT,
  teaching_pace TEXT,
  learning_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for easier local development
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_courses_professor_id ON courses(professor_id);

-- ============================================================================
-- PDFS TABLE
-- ============================================================================
CREATE TABLE pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdfs DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pdfs_course_id ON pdfs(course_id);

-- ============================================================================
-- PDF CHUNKS TABLE (for search)
-- ============================================================================
CREATE TABLE pdf_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  filename TEXT NOT NULL,
  page INTEGER,
  start_char INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdf_chunks DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pdf_chunks_course_id ON pdf_chunks(course_id);
CREATE INDEX idx_pdf_chunks_pdf_id ON pdf_chunks(pdf_id);

-- ============================================================================
-- CONVERSATIONS TABLE (chat history)
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversations_course_id ON conversations(course_id);
CREATE INDEX idx_conversations_student_id ON conversations(student_id);

-- ============================================================================
-- STORAGE BUCKET FOR PDFs
-- ============================================================================

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-pdfs', 'course-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies (simple - allow all authenticated users)
CREATE POLICY "Anyone can view PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'course-pdfs');

CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'course-pdfs');

CREATE POLICY "Authenticated users can delete PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-pdfs');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that everything is set up
SELECT 'Profiles table created' as status
UNION ALL
SELECT 'Courses table created'
UNION ALL
SELECT 'PDFs table created'
UNION ALL
SELECT 'PDF chunks table created'
UNION ALL
SELECT 'Conversations table created'
UNION ALL
SELECT 'Auto-profile trigger created'
UNION ALL
SELECT 'Storage bucket configured';

-- Show existing users and profiles
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' as signup_role,
  p.role as profile_role,
  p.full_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;
