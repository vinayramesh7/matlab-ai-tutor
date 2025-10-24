import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the MATLAB tutor
const TUTOR_SYSTEM_PROMPT = {
  "role": "system",
  "content": [
    {
      "type": "text",
      "text": "You are an interactive MATLAB tutor designed to help students learn MATLAB concepts deeply rather than giving away direct solutions. You act like a patient, knowledgeable professor who uses the Socratic method — guiding students step-by-step, asking questions back, and encouraging them to reason. When possible, reference relevant parts of the provided course materials (PDFs, lecture notes, or links) by filename and section, and cite MATLAB documentation (https://www.mathworks.com/help/) for syntax or function explanations. Respect each professor's chosen teaching style and pace from the course metadata. When you show MATLAB code, explain what it does conceptually before showing it. Always stay in character as a supportive tutor."
    }
  ]
};

/**
 * Generate a tutor response using Claude 3 Haiku
 * @param {Array} conversationHistory - Array of previous messages
 * @param {Object} courseContext - Course metadata and preferences
 * @param {Array} relevantPdfChunks - PDF chunks retrieved from embedding search
 * @returns {Promise<string>} - The tutor's response
 */
export async function generateTutorResponse(conversationHistory, courseContext, relevantPdfChunks = []) {
  try {
    // Build context from course metadata and PDF chunks
    let contextMessage = buildContextMessage(courseContext, relevantPdfChunks);

    // Prepare messages for Claude API
    const messages = [
      {
        role: 'user',
        content: contextMessage
      },
      ...conversationHistory
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: TUTOR_SYSTEM_PROMPT.content[0].text,
      messages: messages
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error generating tutor response:', error);
    throw new Error('Failed to generate tutor response');
  }
}

/**
 * Build context message from course metadata and PDF chunks
 */
function buildContextMessage(courseContext, relevantPdfChunks) {
  let context = `[COURSE CONTEXT]\n`;
  context += `Course: ${courseContext.course_name}\n`;
  context += `Professor: ${courseContext.professor_name}\n`;

  if (courseContext.teaching_style) {
    context += `Teaching Style: ${courseContext.teaching_style}\n`;
  }

  if (courseContext.teaching_pace) {
    context += `Teaching Pace: ${courseContext.teaching_pace}\n`;
  }

  if (courseContext.learning_goals) {
    context += `Learning Goals: ${courseContext.learning_goals}\n`;
  }

  // Add relevant PDF chunks if available
  if (relevantPdfChunks.length > 0) {
    context += `\n[RELEVANT COURSE MATERIALS]\n`;
    relevantPdfChunks.forEach((chunk, index) => {
      context += `\nFrom "${chunk.filename}" (Page ${chunk.page || 'N/A'}):\n${chunk.content}\n`;
    });
  }

  context += `\n[END CONTEXT]\n\nRemember to respect the teaching style and pace above when responding to the student.`;

  return context;
}

/**
 * Stream tutor response (for future real-time streaming implementation)
 */
export async function streamTutorResponse(conversationHistory, courseContext, relevantPdfChunks = []) {
  // For now, we'll return the full response
  // In production, you could implement streaming using anthropic.messages.stream()
  return generateTutorResponse(conversationHistory, courseContext, relevantPdfChunks);
}
