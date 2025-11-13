import pdfParse from 'pdf-parse-fork';

/**
 * Extract and chunk text from PDF buffer with accurate page numbers
 * Uses pdf-parse with custom page rendering to get actual pages
 */
export async function extractAndChunkPDF(pdfBuffer, filename) {
  try {
    console.log(`📄 Extracting PDF: ${filename}`);

    // Custom render function to extract page-by-page
    const options = {
      pagerender: function(pageData) {
        return pageData.getTextContent().then(function(textContent) {
          return textContent.items.map(item => item.str).join(' ');
        });
      }
    };

    const data = await pdfParse(pdfBuffer, options);
    const totalPages = data.numpages;

    console.log(`📄 PDF has ${totalPages} pages`);

    // Now we need to re-parse to get per-page text
    // Since pdf-parse doesn't give us per-page in one go, we'll use a different approach
    // Let's parse multiple times, once per page
    const pages = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const pageOptions = {
          max: pageNum,
          pagerender: options.pagerender
        };

        const pageData = await pdfParse(pdfBuffer, pageOptions);
        // This gives us text up to this page
        // We need to track what's new
        const previousText = pageNum > 1 ? pages[pageNum - 2]?.cumulativeText || '' : '';
        const currentText = pageData.text;
        const newText = currentText.substring(previousText.length);

        pages.push({
          pageNumber: pageNum,
          text: newText,
          cumulativeText: currentText
        });
      } catch (err) {
        console.warn(`⚠️ Could not extract page ${pageNum}:`, err.message);
      }
    }

    console.log(`📄 Extracted ${pages.length} pages`);

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

    // Log page distribution
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
 * Enhanced semantic search for relevant PDF chunks
 * Uses improved scoring with TF-IDF-like approach and semantic context
 * @param {string} query - User's question
 * @param {Array} allChunks - All PDF chunks for a course
 * @param {number} topK - Number of chunks to return
 * @returns {Array} - Most relevant chunks with better accuracy
 */
export function searchRelevantChunks(query, allChunks, topK = 8) {
  if (!allChunks || allChunks.length === 0) {
    return [];
  }

  // Extract keywords from query
  const queryKeywords = extractKeywords(query.toLowerCase());
  const expandedKeywords = expandQueryKeywords(queryKeywords);

  // Calculate IDF (Inverse Document Frequency) for better scoring
  const idf = calculateIDF(queryKeywords, allChunks);

  // Score each chunk with enhanced semantic matching
  const scoredChunks = allChunks.map(chunk => {
    const chunkText = chunk.content.toLowerCase();
    let score = 0;

    // 1. TF-IDF scoring for primary keywords
    queryKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        const tf = matches.length;
        const idfScore = idf[keyword] || 1;
        score += tf * idfScore * keyword.length * 5; // Higher weight for exact keywords
      }
    });

    // 2. Score for expanded/related keywords
    expandedKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += matches.length * keyword.length * 2;
      }
    });

    // 3. Detect and boost semantic markers (headings, sections, definitions)
    const semanticBoost = detectSemanticMarkers(chunkText, queryKeywords);
    score += semanticBoost;

    // 4. Proximity bonus - if multiple keywords appear close together
    const proximityBonus = calculateProximityBonus(chunkText, queryKeywords);
    score += proximityBonus;

    // 5. Context quality - boost chunks that start with headings or definitions
    if (isContextRich(chunkText)) {
      score *= 1.3;
    }

    return { ...chunk, score };
  });

  // Sort by score and return top K, ensuring diversity
  const topChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .filter(chunk => chunk.score > 0);

  // Ensure page diversity - don't return too many chunks from same page
  const diverseChunks = ensurePageDiversity(topChunks, topK);

  return diverseChunks.slice(0, topK);
}

/**
 * Calculate Inverse Document Frequency for keywords
 */
function calculateIDF(keywords, chunks) {
  const idf = {};
  const totalChunks = chunks.length;

  keywords.forEach(keyword => {
    const chunksWithKeyword = chunks.filter(chunk => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(chunk.content);
    }).length;

    // IDF = log(total documents / documents containing term)
    idf[keyword] = chunksWithKeyword > 0
      ? Math.log(totalChunks / chunksWithKeyword) + 1
      : 1;
  });

  return idf;
}

/**
 * Detect semantic markers like headings, definitions, examples
 */
function detectSemanticMarkers(text, keywords) {
  let boost = 0;

  // Check for numbered sections (e.g., "1.2.3", "Section 5")
  if (/\b\d+(\.\d+)*\s+[A-Z]/.test(text) || /\bSection\s+\d+/i.test(text) || /\bChapter\s+\d+/i.test(text)) {
    boost += 50;
  }

  // Check for definition patterns
  keywords.forEach(keyword => {
    const defPatterns = [
      new RegExp(`${keyword}\\s+(is|are|means|refers to|defined as)`, 'i'),
      new RegExp(`(definition|what is|define)\\s+${keyword}`, 'i'),
    ];

    defPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        boost += 40;
      }
    });
  });

  // Check for example patterns
  if (/\b(example|for instance|such as|e\.g\.|consider)\b/i.test(text)) {
    boost += 20;
  }

  // Check for figure/table captions
  if (/\b(Figure|Table|Diagram)\s+\d+/i.test(text)) {
    boost += 30;
  }

  return boost;
}

/**
 * Calculate proximity bonus when keywords appear close together
 */
function calculateProximityBonus(text, keywords) {
  if (keywords.length < 2) return 0;

  let bonus = 0;
  const words = text.toLowerCase().split(/\s+/);

  // Find positions of all keywords
  const positions = {};
  keywords.forEach(keyword => {
    positions[keyword] = [];
    words.forEach((word, idx) => {
      if (word.includes(keyword)) {
        positions[keyword].push(idx);
      }
    });
  });

  // Calculate proximity between keyword pairs
  keywords.forEach((kw1, i) => {
    keywords.slice(i + 1).forEach(kw2 => {
      positions[kw1]?.forEach(pos1 => {
        positions[kw2]?.forEach(pos2 => {
          const distance = Math.abs(pos1 - pos2);
          if (distance < 20) { // Within 20 words
            bonus += (20 - distance) * 2;
          }
        });
      });
    });
  });

  return bonus;
}

/**
 * Check if chunk contains high-quality context (starts with heading, definition, etc.)
 */
function isContextRich(text) {
  const richPatterns = [
    /^\d+(\.\d+)*\s+[A-Z]/,  // Starts with numbered section
    /^(Chapter|Section|Introduction|Definition|Overview)/i,
    /\b(define|definition|means|refers to|is defined as)\b/i,
  ];

  return richPatterns.some(pattern => pattern.test(text));
}

/**
 * Ensure diversity in results - don't return too many chunks from same page
 */
function ensurePageDiversity(chunks, topK) {
  const result = [];
  const pageCount = {};

  for (const chunk of chunks) {
    const page = chunk.page;
    pageCount[page] = (pageCount[page] || 0);

    // Allow max 2 chunks per page in top results
    if (pageCount[page] < 2 || result.length < topK / 2) {
      result.push(chunk);
      pageCount[page]++;
    }

    if (result.length >= topK * 1.5) break; // Get some extra for filtering
  }

  return result;
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
