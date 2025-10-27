import express from 'express';
import { supabase, getAuthUser } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/links/:course_id - Get all links for a course
 */
router.get('/:course_id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id } = req.params;

    const { data, error } = await supabase
      .from('course_links')
      .select('*')
      .eq('course_id', course_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/links - Add a link to a course
 */
router.post('/', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id, title, url, description } = req.body;

    if (!course_id || !title || !url) {
      return res.status(400).json({ error: 'course_id, title, and url are required' });
    }

    // Verify user owns the course
    const { data: course } = await supabase
      .from('courses')
      .select('professor_id')
      .eq('id', course_id)
      .single();

    if (!course || course.professor_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to add links to this course' });
    }

    const { data, error} = await supabase
      .from('course_links')
      .insert({
        course_id,
        title,
        url,
        description
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding link:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/links/:id - Delete a link
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { id } = req.params;

    // Get link details
    const { data: link, error: linkError } = await supabase
      .from('course_links')
      .select('*, courses(professor_id)')
      .eq('id', id)
      .single();

    if (linkError || !link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Verify user owns the course
    if (link.courses.professor_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this link' });
    }

    const { error } = await supabase
      .from('course_links')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
