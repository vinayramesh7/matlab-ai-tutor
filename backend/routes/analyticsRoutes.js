import express from 'express';
import { supabase, getAuthUser } from '../config/supabase.js';
import { getAllTopics, formatTopicName } from '../utils/topicExtraction.js';

const router = express.Router();

/**
 * GET /api/analytics/course/:courseId/overview - Get course overview analytics
 */
router.get('/course/:courseId/overview', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { courseId } = req.params;

    // Verify professor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', user.id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get total students enrolled
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId);

    const totalStudents = enrollments?.length || 0;

    // Get total questions asked in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentQuestions } = await supabase
      .from('analytics_events')
      .select('id')
      .eq('course_id', courseId)
      .eq('event_type', 'question')
      .gte('created_at', sevenDaysAgo.toISOString());

    const questionsThisWeek = recentQuestions?.length || 0;

    // Get all-time questions
    const { data: allQuestions } = await supabase
      .from('analytics_events')
      .select('id')
      .eq('course_id', courseId)
      .eq('event_type', 'question');

    const totalQuestions = allQuestions?.length || 0;

    // Get active students (asked questions in last 7 days)
    const { data: activeStudentIds } = await supabase
      .from('analytics_events')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('event_type', 'question')
      .gte('created_at', sevenDaysAgo.toISOString());

    const uniqueActiveStudents = new Set(activeStudentIds?.map(e => e.student_id) || []);
    const activeStudents = uniqueActiveStudents.size;

    res.json({
      course_name: course.course_name,
      total_students: totalStudents,
      active_students: activeStudents,
      questions_this_week: questionsThisWeek,
      total_questions: totalQuestions
    });
  } catch (error) {
    console.error('Error fetching course overview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/course/:courseId/students - Get student list with activity
 */
router.get('/course/:courseId/students', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { courseId } = req.params;

    // Verify professor owns this course
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', user.id)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get all enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        profiles!enrollments_student_id_fkey(id, full_name, email)
      `)
      .eq('course_id', courseId);

    if (!enrollments) {
      return res.json([]);
    }

    // Get analytics for each student
    const studentsWithAnalytics = await Promise.all(
      enrollments.map(async (enrollment) => {
        const studentId = enrollment.student_id;
        const profile = enrollment.profiles;

        // Get question count
        const { data: questions } = await supabase
          .from('analytics_events')
          .select('id, created_at')
          .eq('course_id', courseId)
          .eq('student_id', studentId)
          .eq('event_type', 'question')
          .order('created_at', { ascending: false });

        const questionCount = questions?.length || 0;
        const lastActive = questions?.[0]?.created_at || null;

        // Determine activity status
        let status = 'inactive';
        if (lastActive) {
          const daysSinceActive = Math.floor(
            (new Date() - new Date(lastActive)) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceActive <= 2) status = 'active';
          else if (daysSinceActive <= 7) status = 'moderate';
        }

        return {
          id: studentId,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          question_count: questionCount,
          last_active: lastActive,
          status: status
        };
      })
    );

    // Sort by question count (most active first)
    studentsWithAnalytics.sort((a, b) => b.question_count - a.question_count);

    res.json(studentsWithAnalytics);
  } catch (error) {
    console.error('Error fetching student list:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/course/:courseId/topics - Get topic distribution for heatmap
 */
router.get('/course/:courseId/topics', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { courseId } = req.params;

    // Verify professor owns this course
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', user.id)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get all analytics events for this course
    const { data: events } = await supabase
      .from('analytics_events')
      .select('topic')
      .eq('course_id', courseId)
      .eq('event_type', 'question');

    // Count questions per topic
    const topicCounts = {};
    const allTopics = getAllTopics();

    // Initialize all topics with 0
    allTopics.forEach(topic => {
      topicCounts[topic] = 0;
    });

    // Count actual questions
    events?.forEach(event => {
      if (event.topic && topicCounts.hasOwnProperty(event.topic)) {
        topicCounts[event.topic]++;
      }
    });

    // Format for frontend
    const topicData = Object.entries(topicCounts).map(([topic, count]) => ({
      topic: topic,
      display_name: formatTopicName(topic),
      question_count: count
    }));

    // Sort by question count (descending)
    topicData.sort((a, b) => b.question_count - a.question_count);

    res.json(topicData);
  } catch (error) {
    console.error('Error fetching topic distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/student/:studentId/:courseId - Get individual student analytics
 */
router.get('/student/:studentId/:courseId', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { studentId, courseId } = req.params;

    // Verify professor owns this course
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('professor_id', user.id)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    // Get all activity
    const { data: allActivity } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('event_type', 'question')
      .order('created_at', { ascending: false });

    const totalQuestions = allActivity?.length || 0;

    // Get unique topics asked about
    const uniqueTopics = new Set(allActivity?.map(a => a.topic).filter(Boolean) || []);

    // Count questions per topic
    const topicCounts = {};
    allActivity?.forEach(event => {
      if (event.topic) {
        topicCounts[event.topic] = (topicCounts[event.topic] || 0) + 1;
      }
    });

    // Format topic breakdown
    const topicBreakdown = Object.entries(topicCounts).map(([topic, count]) => ({
      topic: formatTopicName(topic),
      question_count: count
    })).sort((a, b) => b.question_count - a.question_count);

    // Format activity timeline (last 20)
    const timeline = allActivity?.slice(0, 20).map(event => ({
      topic: formatTopicName(event.topic),
      message: event.message_content,
      created_at: event.created_at
    })) || [];

    res.json({
      student: {
        id: studentId,
        name: profile?.full_name || 'Unknown',
        email: profile?.email || ''
      },
      stats: {
        total_questions: totalQuestions,
        topics_explored: uniqueTopics.size
      },
      topic_breakdown: topicBreakdown,
      activity_timeline: timeline
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
