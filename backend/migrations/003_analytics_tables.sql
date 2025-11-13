-- Analytics Tables for Student Progress Tracking
-- Run this in Supabase SQL Editor

-- Track conversation analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'question', 'code_review', 'pdf_view'
  topic VARCHAR(100), -- extracted topic (loops, matrices, etc.)
  message_content TEXT, -- the actual question (for topic extraction)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_student ON analytics_events(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_course ON analytics_events(course_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_topic ON analytics_events(topic);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- Track student concept mastery
CREATE TABLE IF NOT EXISTS student_mastery (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  concept VARCHAR(100) NOT NULL,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100),
  questions_asked INTEGER DEFAULT 0,
  last_practiced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, course_id, concept)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_mastery_student ON student_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_course ON student_mastery(course_id);

-- Track learning sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  questions_asked INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_course ON learning_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_started ON learning_sessions(started_at);

-- Enable RLS (Row Level Security)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
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

-- RLS Policies for student_mastery
CREATE POLICY "Professors can view mastery for their courses"
  ON student_mastery FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own mastery"
  ON student_mastery FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "System can insert and update mastery"
  ON student_mastery FOR ALL
  WITH CHECK (true);

-- RLS Policies for learning_sessions
CREATE POLICY "Professors can view sessions for their courses"
  ON learning_sessions FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own sessions"
  ON learning_sessions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "System can insert and update sessions"
  ON learning_sessions FOR ALL
  WITH CHECK (true);
