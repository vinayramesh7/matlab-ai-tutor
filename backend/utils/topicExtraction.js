/**
 * Topic extraction utility for MATLAB concepts
 * Analyzes conversation messages to identify which topics students are asking about
 */

// MATLAB concept keywords mapping
const topicKeywords = {
  'basics': ['variable', 'assignment', 'workspace', 'command', 'basic', 'start', 'introduction'],
  'arrays_matrices': ['array', 'matrix', 'matrices', 'vector', 'dimension', 'size', 'reshape', 'transpose'],
  'loops': ['for', 'while', 'loop', 'iteration', 'iterate', 'repeat', 'nested loop'],
  'conditionals': ['if', 'else', 'elseif', 'switch', 'case', 'condition', 'comparison'],
  'functions': ['function', 'return', 'input', 'output', 'parameter', 'argument', 'call'],
  'plotting': ['plot', 'graph', 'figure', 'visualization', 'chart', 'subplot', 'axis', 'xlabel', 'ylabel'],
  'file_io': ['fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf', 'load', 'save', 'file'],
  'operators': ['operator', 'arithmetic', 'addition', 'subtraction', 'multiplication', 'division'],
  'strings': ['string', 'char', 'text', 'concatenation', 'strcmp', 'strcat'],
  'cell_arrays': ['cell', 'cell array', 'cellstr'],
  'structures': ['struct', 'structure', 'field'],
  'debugging': ['error', 'debug', 'breakpoint', 'warning', 'exception', 'try', 'catch'],
  'performance': ['performance', 'optimize', 'speed', 'efficient', 'vectorize'],
  'advanced': ['object', 'class', 'oop', 'handle', 'anonymous function', 'lambda']
};

/**
 * Extract the main topic from a message using keyword matching
 * @param {string} message - The user's question or message
 * @returns {string|null} - The identified topic or null
 */
export function extractTopic(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const lowerMessage = message.toLowerCase();
  const topicScores = {};

  // Score each topic based on keyword matches
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    let score = 0;

    for (const keyword of keywords) {
      // Use word boundary regex for accurate matching
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerMessage.match(regex);

      if (matches) {
        // Weight by keyword length (longer keywords are more specific)
        score += matches.length * keyword.length;
      }
    }

    if (score > 0) {
      topicScores[topic] = score;
    }
  }

  // Return topic with highest score
  if (Object.keys(topicScores).length === 0) {
    return 'general'; // Default topic if no matches
  }

  const topTopic = Object.entries(topicScores)
    .sort(([, a], [, b]) => b - a)[0][0];

  return topTopic;
}

/**
 * Calculate mastery level for a concept based on activity
 * @param {number} questionsAsked - Number of questions about this topic
 * @param {Date} lastPracticed - When they last asked about it
 * @param {number} currentMastery - Current mastery level
 * @returns {number} - Updated mastery level (0-100)
 */
export function calculateMasteryLevel(questionsAsked, lastPracticed, currentMastery = 0) {
  // More questions early on = learning phase (mastery increases)
  // Fewer questions later = mastered (mastery stays high)
  // No activity for long time = may have forgotten (mastery decreases)

  const now = new Date();
  const daysSinceLastPractice = lastPracticed
    ? Math.floor((now - new Date(lastPracticed)) / (1000 * 60 * 60 * 24))
    : 0;

  let newMastery = currentMastery;

  // Learning phase: each question increases mastery
  if (questionsAsked <= 5) {
    // Early learning: rapid increase
    newMastery = Math.min(40, questionsAsked * 8);
  } else if (questionsAsked <= 10) {
    // Intermediate: slower increase
    newMastery = 40 + ((questionsAsked - 5) * 8);
  } else {
    // Advanced: mastered
    newMastery = Math.min(95, 80 + ((questionsAsked - 10) * 2));
  }

  // Decay over time (if not practiced recently)
  if (daysSinceLastPractice > 14) {
    // Hasn't practiced in 2+ weeks, reduce mastery
    const decayFactor = Math.min(0.3, (daysSinceLastPractice - 14) * 0.02);
    newMastery = Math.max(0, newMastery * (1 - decayFactor));
  } else if (daysSinceLastPractice > 7) {
    // 1-2 weeks, slight decay
    newMastery = Math.max(0, newMastery * 0.95);
  }

  return Math.round(Math.min(100, newMastery));
}

/**
 * Get all supported topics
 * @returns {Array} - List of all topic names
 */
export function getAllTopics() {
  return Object.keys(topicKeywords);
}

/**
 * Format topic name for display
 * @param {string} topic - Topic key
 * @returns {string} - Formatted topic name
 */
export function formatTopicName(topic) {
  const nameMap = {
    'basics': 'Basics',
    'arrays_matrices': 'Arrays & Matrices',
    'loops': 'Loops',
    'conditionals': 'Conditionals',
    'functions': 'Functions',
    'plotting': 'Plotting',
    'file_io': 'File I/O',
    'operators': 'Operators',
    'strings': 'Strings',
    'cell_arrays': 'Cell Arrays',
    'structures': 'Structures',
    'debugging': 'Debugging',
    'performance': 'Performance',
    'advanced': 'Advanced Topics',
    'general': 'General'
  };

  return nameMap[topic] || topic;
}
