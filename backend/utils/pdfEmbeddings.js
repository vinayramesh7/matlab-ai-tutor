import pdfParse from 'pdf-parse-fork';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

/**
 * Extract text from PDF page by page using pdf.js
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Array>} - Array of {pageNumber, text} objects
 */
async function extractPageByPage(pdfBuffer) {
  const data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;

  const pages = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    pages.push({ pageNumber: pageNum, text });
  }

  return pages;
}

/**
 * Extract and chunk text from PDF buffer with accurate page numbers
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - Name of the PDF file
 * @returns {Promise<Array>} - Array of text chunks with metadata
 */
export async function extractAndChunkPDF(pdfBuffer, filename) {
  try {
    console.log(`📄 Extracting PDF: ${filename}`);

    // Extract text page by page for accurate page numbers
    const pages = await extractPageByPage(pdfBuffer);
    console.log(`📄 PDF has ${pages.length} pages`);

    const chunks = [];
    const chunkSize = 500;
    const overlap = 100;

    // Process each page
    pages.forEach(({ pageNumber, text }) => {
      if (!text || text.trim().length === 0) {
        return; // Skip empty pages
      }

      // Chunk the page text
      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        const chunk = text.slice(i, i + chunkSize);
        if (chunk.trim().length > 50) {
          chunks.push({
            content: chunk.trim(),
            filename: filename,
            page: pageNumber,
            start_char: i
          });
        }
      }
    });

    console.log(`✅ Extracted ${chunks.length} chunks from ${pages.length} pages`);

    // Log page distribution to verify
    const pageDistribution = {};
    chunks.forEach(chunk => {
      pageDistribution[chunk.page] = (pageDistribution[chunk.page] || 0) + 1;
    });
    console.log(`📊 Page distribution: ${Object.keys(pageDistribution).length} unique pages covered`);

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
export function searchRelevantChunks(query, allChunks, topK = 5) {
  if (!allChunks || allChunks.length === 0) {
    return [];
  }

  // Extract keywords from query (simple tokenization)
  const queryKeywords = extractKeywords(query.toLowerCase());

  // Add concept-related keywords for better matching
  const expandedKeywords = expandQueryKeywords(queryKeywords);

  // Score each chunk based on keyword matches
  const scoredChunks = allChunks.map(chunk => {
    const chunkText = chunk.content.toLowerCase();
    let score = 0;

    // Score for primary keywords
    queryKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += matches.length * keyword.length * 3; // Higher weight for exact keywords
      }
    });

    // Score for expanded/related keywords
    expandedKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += matches.length * keyword.length; // Lower weight for related keywords
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
 * Expand query keywords with related terms for better matching
 */
function expandQueryKeywords(keywords) {
  const expansions = {
    'loop': ['for', 'while', 'iteration', 'repeat', 'control flow'],
    'loops': ['for', 'while', 'iteration', 'repeat', 'control flow'],
    'function': ['functions', 'method', 'subroutine'],
    'functions': ['function', 'method', 'subroutine'],
    'array': ['arrays', 'matrix', 'matrices', 'vector'],
    'arrays': ['array', 'matrix', 'matrices', 'vector'],
    'plot': ['plotting', 'graph', 'visualization', 'figure'],
    'variable': ['variables', 'data', 'value'],
    'conditional': ['if', 'else', 'switch', 'case', 'condition'],
    'error': ['errors', 'exception', 'debug', 'debugging']
  };

  const expanded = new Set();
  keywords.forEach(keyword => {
    if (expansions[keyword]) {
      expansions[keyword].forEach(exp => expanded.add(exp));
    }
  });

  return Array.from(expanded);
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
