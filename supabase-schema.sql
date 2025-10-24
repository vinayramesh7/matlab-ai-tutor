-- MATLAB AI Tutor - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'professor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
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

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Professors can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'professor'
    )
  );

CREATE POLICY "Professors can update their own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (professor_id = auth.uid());

CREATE POLICY "Professors can delete their own courses"
  ON courses FOR DELETE
  TO authenticated
  USING (professor_id = auth.uid());

-- PDFs table
CREATE TABLE IF NOT EXISTS pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

-- PDFs policies
CREATE POLICY "Anyone can view PDFs for courses"
  ON pdfs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Course professors can upload PDFs"
  ON pdfs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Course professors can delete PDFs"
  ON pdfs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND courses.professor_id = auth.uid()
    )
  );

-- PDF Chunks table (for embedding-based search)
CREATE TABLE IF NOT EXISTS pdf_chunks (
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

ALTER TABLE pdf_chunks ENABLE ROW LEVEL SECURITY;

-- PDF Chunks policies
CREATE POLICY "Anyone can view PDF chunks"
  ON pdf_chunks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert PDF chunks"
  ON pdf_chunks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "System can delete PDF chunks"
  ON pdf_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND courses.professor_id = auth.uid()
    )
  );

-- Conversations table (chat history)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_professor_id ON courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_course_id ON pdfs(course_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_course_id ON pdf_chunks(course_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_pdf_id ON pdf_chunks(pdf_id);
CREATE INDEX IF NOT EXISTS idx_conversations_course_id ON conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON conversations(student_id);

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

-- Create storage bucket for PDFs (run this in Supabase Storage settings or via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-pdfs', 'course-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-pdfs bucket
CREATE POLICY "Authenticated users can view PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'course-pdfs');

CREATE POLICY "Professors can upload PDFs to their courses"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-pdfs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Professors can delete their course PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-pdfs'
    AND auth.role() = 'authenticated'
  );
