import express from 'express';
import multer from 'multer';
import { supabase, getAuthUser } from '../config/supabase.js';
import { extractAndChunkPDF, storePDFChunks } from '../utils/pdfEmbeddings.js';

const router = express.Router();

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * POST /api/pdfs/upload - Upload a PDF for a course
 */
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // Verify user owns the course
    const { data: course } = await supabase
      .from('courses')
      .select('professor_id')
      .eq('id', course_id)
      .single();

    if (!course || course.professor_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to upload to this course' });
    }

    // Upload to Supabase Storage
    const filename = `${Date.now()}-${req.file.originalname}`;
    const filePath = `${course_id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('course-pdfs')
      .upload(filePath, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-pdfs')
      .getPublicUrl(filePath);

    // Save PDF metadata to database
    const { data: pdfRecord, error: dbError } = await supabase
      .from('pdfs')
      .insert({
        course_id: course_id,
        filename: req.file.originalname,
        file_path: filePath,
        file_url: urlData.publicUrl
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Extract and store PDF chunks for search
    try {
      const chunks = await extractAndChunkPDF(req.file.buffer, req.file.originalname);
      await storePDFChunks(supabase, course_id, pdfRecord.id, chunks);
      console.log(`Extracted ${chunks.length} chunks from ${req.file.originalname}`);
    } catch (chunkError) {
      console.error('Error processing PDF chunks:', chunkError);
      // Don't fail the upload if chunking fails
    }

    res.status(201).json(pdfRecord);
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pdfs/:course_id - Get all PDFs for a course
 */
router.get('/:course_id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { course_id } = req.params;

    const { data, error } = await supabase
      .from('pdfs')
      .select('*')
      .eq('course_id', course_id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/pdfs/:id - Delete a PDF
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { id } = req.params;

    // Get PDF details
    const { data: pdf, error: pdfError } = await supabase
      .from('pdfs')
      .select('*, courses(professor_id)')
      .eq('id', id)
      .single();

    if (pdfError || !pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Verify user owns the course
    if (pdf.courses.professor_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this PDF' });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('course-pdfs')
      .remove([pdf.file_path]);

    if (storageError) console.error('Storage delete error:', storageError);

    // Delete chunks from database
    await supabase
      .from('pdf_chunks')
      .delete()
      .eq('pdf_id', id);

    // Delete PDF record
    const { error: deleteError } = await supabase
      .from('pdfs')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
