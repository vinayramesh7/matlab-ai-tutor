import express from 'express';
import { supabase, getAuthUser } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/courses - Get all courses (students) or professor's courses (professors)
 */
router.get('/', async (req, res) => {
  try {
    const user = await getAuthUser(req);

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('courses')
      .select(`
        *,
        profiles!courses_professor_id_fkey(id, full_name, email)
      `);

    // If professor, only show their courses
    if (profile?.role === 'professor') {
      query = query.eq('professor_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:id - Get a specific course
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { id } = req.params;

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles!courses_professor_id_fkey(id, full_name, email),
        pdfs(id, filename, file_path, uploaded_at)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses - Create a new course (professors only)
 */
router.post('/', async (req, res) => {
  try {
    const user = await getAuthUser(req);

    // Verify user is a professor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'professor') {
      return res.status(403).json({ error: 'Only professors can create courses' });
    }

    const {
      course_name,
      description,
      teaching_style,
      teaching_pace,
      learning_goals
    } = req.body;

    if (!course_name) {
      return res.status(400).json({ error: 'Course name is required' });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        professor_id: user.id,
        course_name,
        description,
        teaching_style,
        teaching_pace,
        learning_goals
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/courses/:id - Update a course (professor only, own courses)
 */
router.put('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { id } = req.params;

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('professor_id')
      .eq('id', id)
      .single();

    if (!course || course.professor_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to update this course' });
    }

    const {
      course_name,
      description,
      teaching_style,
      teaching_pace,
      learning_goals
    } = req.body;

    const { data, error } = await supabase
      .from('courses')
      .update({
        course_name,
        description,
        teaching_style,
        teaching_pace,
        learning_goals
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/courses/:id - Delete a course (professor only, own courses)
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { id } = req.params;

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('professor_id')
      .eq('id', id)
      .single();

    if (!course || course.professor_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this course' });
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
