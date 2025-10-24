import express from 'express';
import { supabase, getAuthUser } from '../config/supabase.js';
import { generateTutorResponse } from '../ai/tutorAgent.js';
import { getCoursePDFChunks, searchRelevantChunks } from '../utils/pdfEmbeddings.js';

const router = express.Router();

/**
 * POST /api/chat/message - Send a message to the tutor and get a response
 */
router.post('/message', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id, message, conversation_history = [] } = req.body;

    if (!course_id || !message) {
      return res.status(400).json({ error: 'course_id and message are required' });
    }

    // Fetch course details and teaching preferences
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        profiles!courses_professor_id_fkey(full_name)
      `)
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Prepare course context for the tutor
    const courseContext = {
      course_name: course.course_name,
      professor_name: course.profiles?.full_name || 'Professor',
      teaching_style: course.teaching_style,
      teaching_pace: course.teaching_pace,
      learning_goals: course.learning_goals
    };

    // Retrieve PDF chunks for this course
    const pdfChunks = await getCoursePDFChunks(supabase, course_id);

    // Search for relevant PDF chunks based on the student's message
    const relevantChunks = searchRelevantChunks(message, pdfChunks, 3);

    // Prepare conversation history for Claude API
    const formattedHistory = conversation_history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add current message
    formattedHistory.push({
      role: 'user',
      content: message
    });

    // Generate tutor response
    const tutorResponse = await generateTutorResponse(
      formattedHistory,
      courseContext,
      relevantChunks
    );

    // Store the conversation in the database
    await supabase.from('conversations').insert([
      {
        course_id: course_id,
        student_id: user.id,
        role: 'user',
        content: message
      },
      {
        course_id: course_id,
        student_id: user.id,
        role: 'assistant',
        content: tutorResponse
      }
    ]);

    res.json({
      response: tutorResponse,
      relevant_materials: relevantChunks.map(chunk => ({
        filename: chunk.filename,
        page: chunk.page
      }))
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/history/:course_id - Get conversation history for a course
 */
router.get('/history/:course_id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id } = req.params;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('course_id', course_id)
      .eq('student_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/chat/history/:course_id - Clear conversation history for a course
 */
router.delete('/history/:course_id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id } = req.params;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('course_id', course_id)
      .eq('student_id', user.id);

    if (error) throw error;

    res.json({ message: 'Conversation history cleared' });
  } catch (error) {
    console.error('Error clearing conversation history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
