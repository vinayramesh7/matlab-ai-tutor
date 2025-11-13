import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { supabase, getAuthUser } from '../config/supabase.js';
import { generateTutorResponse } from '../ai/tutorAgent.js';
import { getCoursePDFChunks, searchRelevantChunks } from '../utils/pdfEmbeddings.js';

const execPromise = promisify(exec);
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

    // Fetch course links
    const { data: links } = await supabase
      .from('course_links')
      .select('*')
      .eq('course_id', course_id)
      .order('created_at', { ascending: true });

    // Prepare course context for the tutor
    const courseContext = {
      course_name: course.course_name,
      professor_name: course.profiles?.full_name || 'Professor',
      learning_goals: course.learning_goals,
      links: links || []
    };

    // Retrieve PDF chunks for this course
    const pdfChunks = await getCoursePDFChunks(supabase, course_id);
    console.log(`📚 Found ${pdfChunks.length} total PDF chunks for course`);

    // Search for relevant PDF chunks based on the student's message (using enhanced semantic search)
    const relevantChunks = searchRelevantChunks(message, pdfChunks, 8);
    console.log(`🔍 Found ${relevantChunks.length} relevant chunks for query: "${message}"`);
    relevantChunks.forEach((chunk, i) => {
      console.log(`  ${i + 1}. "${chunk.filename}" - Page ${chunk.page} (score: ${chunk.score?.toFixed(1)})`);
      console.log(`      Preview: ${chunk.content.substring(0, 80)}...`);
    });

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

/**
 * POST /api/chat/execute - Execute MATLAB/Octave code
 */
router.post('/execute', async (req, res) => {
  try {
    await getAuthUser(req); // Ensure user is authenticated
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Security: Limit code length
    if (code.length > 10000) {
      return res.status(400).json({ error: 'Code too long (max 10000 characters)' });
    }

    console.log('🔧 Executing MATLAB/Octave code...');

    // First check if Octave is installed
    try {
      await execPromise('which octave', { timeout: 1000 });
    } catch (error) {
      return res.status(503).json({
        error: true,
        message: 'Octave is not installed on this server. Please install GNU Octave to enable code execution.\n\nOn Ubuntu/Debian: sudo apt-get install octave\nOn macOS: brew install octave\nOn Windows: Download from https://octave.org'
      });
    }

    // Try to execute with Octave (MATLAB-compatible)
    // Using --eval to execute code directly
    // --quiet to suppress startup messages
    // --no-gui to run without GUI
    const { stdout, stderr } = await execPromise(
      `octave --quiet --no-gui --eval "${code.replace(/"/g, '\\"')}"`,
      {
        timeout: 10000, // 10 second timeout
        maxBuffer: 1024 * 1024, // 1MB max output
      }
    );

    console.log('✅ Code executed successfully');

    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      success: true
    });
  } catch (error) {
    console.error('❌ Error executing code:', error);

    // Handle timeout
    if (error.killed) {
      return res.status(408).json({
        error: true,
        message: 'Code execution timed out (10 second limit)'
      });
    }

    // Handle execution errors
    res.json({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      success: false
    });
  }
});

export default router;
