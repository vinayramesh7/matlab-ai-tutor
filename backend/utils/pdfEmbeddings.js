import pdfParse from 'pdf-parse-fork';

/**
 * Extract and chunk text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - Name of the PDF file
 * @returns {Promise<Array>} - Array of text chunks with metadata
 */
export async function extractAndChunkPDF(pdfBuffer, filename) {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // Split into chunks (roughly 500 characters each with overlap)
    const chunkSize = 500;
    const overlap = 100;
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim().length > 50) { // Only keep meaningful chunks
        chunks.push({
          content: chunk.trim(),
          filename: filename,
          page: Math.floor(i / 2000) + 1, // Rough page estimation
          start_char: i
        });
      }
    }

    return chunks;
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw new Error('Failed to extract PDF content');
  }
}

/**
 * Simple keyword-based search for relevant PDF chunks
 * This is a basic implementation - in production, you'd use vector embeddings
 * @param {string} query - User's question
 * @param {Array} allChunks - All PDF chunks for a course
 * @param {number} topK - Number of chunks to return
 * @returns {Array} - Most relevant chunks
 */
export function searchRelevantChunks(query, allChunks, topK = 3) {
  if (!allChunks || allChunks.length === 0) {
    return [];
  }

  // Extract keywords from query (simple tokenization)
  const queryKeywords = extractKeywords(query.toLowerCase());

  // Score each chunk based on keyword matches
  const scoredChunks = allChunks.map(chunk => {
    const chunkText = chunk.content.toLowerCase();
    let score = 0;

    queryKeywords.forEach(keyword => {
      // Count occurrences of each keyword
      const regex = new RegExp(keyword, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += matches.length * keyword.length; // Weight by keyword length
      }
    });

    return { ...chunk, score };
  });

  // Sort by score and return top K
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .filter(chunk => chunk.score > 0)
    .slice(0, topK);
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text) {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'can', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'to', 'from', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as',
    'this', 'that', 'these', 'those', 'my', 'your', 'help', 'me', 'understand'
  ]);

  return text
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter((word, index, self) => self.indexOf(word) === index); // Unique words
}

/**
 * Store PDF chunks in Supabase
 * @param {Object} supabase - Supabase client
 * @param {number} courseId - Course ID
 * @param {number} pdfId - PDF ID
 * @param {Array} chunks - PDF chunks to store
 */
export async function storePDFChunks(supabase, courseId, pdfId, chunks) {
  try {
    const chunksWithMetadata = chunks.map((chunk, index) => ({
      course_id: courseId,
      pdf_id: pdfId,
      chunk_index: index,
      content: chunk.content,
      filename: chunk.filename,
      page: chunk.page,
      start_char: chunk.start_char
    }));

    const { error } = await supabase
      .from('pdf_chunks')
      .insert(chunksWithMetadata);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error storing PDF chunks:', error);
    throw new Error('Failed to store PDF chunks');
  }
}

/**
 * Retrieve all PDF chunks for a course
 */
export async function getCoursePDFChunks(supabase, courseId) {
  try {
    const { data, error } = await supabase
      .from('pdf_chunks')
      .select('*')
      .eq('course_id', courseId);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error retrieving PDF chunks:', error);
    return [];
  }
}
