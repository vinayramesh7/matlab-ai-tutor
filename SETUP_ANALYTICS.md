# Setting Up Analytics Dashboard

The Analytics Dashboard provides professors with Khan Academy-style insights into student progress and engagement.

## Features

### For Professors:
- **Course Overview**: View total students, active students, questions this week, and average mastery
- **Topic Heatmap**: See which MATLAB topics students are asking about most
- **Student Activity List**: Monitor individual student engagement with color-coded status (active/moderate/inactive)
- **Individual Student View**: Deep dive into each student's concept mastery and activity timeline

### Auto-Tracked Metrics:
- **Topic Extraction**: Automatically identifies which MATLAB concept each question relates to (15 topics including loops, matrices, functions, plotting, etc.)
- **Mastery Levels**: Calculates 0-100% mastery for each concept based on question frequency and recency
- **Activity Status**: Categorizes students as active (last 2 days), moderate (last 7 days), or inactive
- **Time Decay**: Mastery levels gradually decrease if a concept isn't practiced (encourages review)

## Setup Steps

### Step 1: Run Database Migration

You need to create the analytics tables in Supabase:

1. Go to your Supabase project at https://app.supabase.com
2. Open the **SQL Editor** from the left sidebar
3. Click **New Query**
4. Copy the entire contents of `backend/migrations/003_analytics_tables.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

This creates three tables:
- `analytics_events` - Tracks every question asked
- `student_mastery` - Stores concept mastery levels per student
- `learning_sessions` - Records learning session data

### Step 2: Restart Backend

The analytics tracking is already integrated into the chat endpoint, so just restart your backend:

```bash
cd backend
npm start
```

### Step 3: Access Analytics

1. Log in as a professor
2. Go to your dashboard
3. Click the **📊 Analytics** button on any course card
4. View real-time analytics as students ask questions!

## How It Works

### Analytics Tracking Flow

1. **Student asks a question** → Chat route (`/api/chat/message`)
2. **Topic is extracted** → Uses keyword matching (e.g., "loop" → `loops` topic)
3. **Event is logged** → Inserts into `analytics_events` table
4. **Mastery is updated** → Calculates new mastery level:
   - Early learning: +8% per question (0-40%)
   - Intermediate: +8% per question (40-80%)
   - Advanced: +2% per question (80-95%)
   - Time decay: -5% if not practiced for 1-2 weeks, -30% if >2 weeks
5. **Dashboard updates** → Professors see real-time data

### Mastery Level Algorithm

```javascript
// First few questions: Rapid learning
questions 1-5: 8% per question (0-40%)
questions 6-10: 8% per question (40-80%)
questions 11+: 2% per question (80-95% cap)

// Time decay (encourages review)
0-7 days: No decay
7-14 days: -5% decay
14+ days: -2% per day (max -30%)
```

### Topic Keywords

The system recognizes 15 MATLAB topics:
- **Basics**: variable, assignment, workspace
- **Arrays & Matrices**: array, matrix, vector, dimension
- **Loops**: for, while, loop, iteration
- **Conditionals**: if, else, switch, case
- **Functions**: function, return, input, output
- **Plotting**: plot, graph, figure
- **File I/O**: fopen, fread, fwrite, save, load
- **Operators**: arithmetic, +, -, *, /
- **Strings**: string, char, text
- **Cell Arrays**: cell, cellstr
- **Structures**: struct, field
- **Debugging**: error, debug, breakpoint
- **Performance**: optimize, vectorize
- **Advanced**: OOP, class, handle
- **General**: Fallback for unmatched questions

## Dashboard Views

### 1. Course Overview (Top Cards)
- Total Students
- Active Students (last 7 days)
- Questions This Week
- Total Questions (all time)
- Average Mastery Across All Concepts

### 2. Topic Heatmap (Left Panel)
- Bar chart showing top 10 most-asked topics
- Question count per topic
- Helps identify which concepts need more materials

### 3. Student Activity List (Right Panel)
- All enrolled students with activity metrics
- Color-coded status badges
- Click any student to see detailed view

### 4. Student Detail Modal (Click any student)
- Overall stats (avg mastery, total questions, concepts explored)
- Concept mastery grid (color-coded by level)
- Recent activity timeline with questions

## Color Coding

### Mastery Levels:
- 🟢 **Green** (80-100%): Strong mastery
- 🟡 **Yellow** (50-79%): Moderate understanding
- 🔴 **Red** (0-49%): Needs more practice

### Activity Status:
- 🟢 **Active**: Asked questions in last 2 days
- 🟡 **Moderate**: Asked questions in last 7 days
- ⚪ **Inactive**: No questions in 7+ days

## Privacy & Security

- **Row Level Security (RLS)**: Professors can only see analytics for their own courses
- **Students can view their own data**: Future feature can allow students to see their progress
- **No PII stored**: Questions are stored but can be purged if needed
- **Async tracking**: Analytics never slow down chat responses

## Troubleshooting

### Analytics button doesn't appear
- Make sure you're logged in as a professor (not a student)
- Refresh the page after login

### No data showing
- Make sure you ran the database migration
- Check that students have asked questions (test by chatting as a student)
- Open browser console and check for API errors

### "Course not found or access denied"
- This means the professor doesn't own the course
- Make sure you're viewing analytics for your own courses

### Mastery levels seem wrong
- The algorithm is designed to be strict (encourages practice)
- Mastery decays over time if not practiced
- Check `last_practiced` date in student mastery view

## Future Enhancements (Not in MVP)

- Weekly email reports for professors
- Student self-view (see their own progress)
- Concept recommendations (suggest topics to review)
- Learning path visualization
- Exportable reports (CSV, PDF)
- Class comparison analytics
- Question quality metrics

---

**Need Help?** Check the database migration ran successfully by viewing the tables in Supabase Table Editor.
