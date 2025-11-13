-- Simple Analytics for Activity Tracking
-- Run this in Supabase SQL Editor

-- Track student questions and activity
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'question'
  topic VARCHAR(100), -- extracted topic (loops, matrices, etc.) for heatmap
  message_content TEXT, -- the actual question
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_student ON analytics_events(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_course ON analytics_events(course_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_topic ON analytics_events(topic);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Professors can view analytics for their courses"
  ON analytics_events FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own analytics"
  ON analytics_events FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "System can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);
