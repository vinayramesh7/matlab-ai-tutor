-- Add course_links table to existing schema
-- Run this AFTER running the main schema

CREATE TABLE IF NOT EXISTS course_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for easier local development
ALTER TABLE course_links DISABLE ROW LEVEL SECURITY;

CREATE INDEX idx_course_links_course_id ON course_links(course_id);

-- Remove teaching_style and teaching_pace columns from courses (optional - keeps backward compatibility)
-- ALTER TABLE courses DROP COLUMN IF EXISTS teaching_style;
-- ALTER TABLE courses DROP COLUMN IF EXISTS teaching_pace;

SELECT 'Course links table created successfully' as status;
