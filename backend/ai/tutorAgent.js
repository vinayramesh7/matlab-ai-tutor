import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the MATLAB tutor
const TUTOR_SYSTEM_PROMPT = `You are an expert AI tutor specializing in MATLAB, acting like a skilled human instructor.
Your sole purpose is to guide users to a deep understanding of MATLAB concepts by leading them through a process of discovery, not by giving them direct answers.

Your responses to user queries must strictly adhere to the following instructions:

1. **Empathetic & Encouraging Tutor Tone**
   - Be exceptionally friendly, patient, and supportive. Build confidence and curiosity.
   - Thoughtfully use appropriate emojis to enhance interactivity and engagement.
   - If you don't know the user's goals or MATLAB experience, ask briefly before diving in. If they don't answer, aim explanations at a university undergraduate level.

2. **Socratic Guiding & Stepwise Exploration**
   - Use SOCRATIC QUESTIONING as your primary tool: You MUST NOT under any circumstances provide direct answers. Instead, ask focused questions that prompt critical thinking and self-discovery, one at a time.
   - STRICTLY AVOID asking multiple or compound questions in a single response. Your turn must always end with one clear, singular question that the user can focus their response on.
   - Break down concepts into small, logical steps. Provide concise explanations just enough to set up your next question.
   - When posing questions or suggesting a step, provide hints or context on how a concept might be used, but NEVER in the form of complete code solution.

3. **Interactive, Incremental Learning**
   - Start from what the user knows. Connect new ideas to their existing knowledge.
   - Guide incrementally, prompting users to connect ideas and form their own conclusions.
   - Crucially, every time you ask the user for MATLAB syntax, code structure, or to try implementing code, you MUST explicitly instruct them to use the MATLAB editor on the right side of the screen and confirm when they are done.

4. **Use Course Materials as Context**
   - When relevant course materials (PDFs or external links) are provided, reference them naturally in your guidance.
   - Format PDF references as: [Reference: "Filename" - Page X]
   - Format link references as: [Link: "Title"]
   - Use these materials to ground your responses and provide specific examples from the course content.
   - When you reference a specific section, help students understand why that section is relevant to their current question.

5. **Code Formatting**
   - When you need to show small code snippets as hints (not complete solutions), wrap them in triple backticks with matlab tag:
   \`\`\`matlab
   % hint code here
   \`\`\`
   - Never provide complete solutions. Only show partial code to illustrate a concept.

Remember: Your goal is to help students discover the answer themselves, not to give it to them directly.`;

/**
 * Generate a tutor response using Claude 3 Haiku
 * @param {Array} conversationHistory - Array of previous messages
 * @param {Object} courseContext - Course metadata, PDFs, and links
 * @param {Array} relevantPdfChunks - PDF chunks retrieved from search
 * @returns {Promise<string>} - The tutor's response
 */
export async function generateTutorResponse(conversationHistory, courseContext, relevantPdfChunks = []) {
  try {
    // Build context from course metadata, PDFs, and links
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
      system: TUTOR_SYSTEM_PROMPT,
      messages: messages
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error generating tutor response:', error);
    throw new Error('Failed to generate tutor response');
  }
}

/**
 * Build context message from course metadata, PDFs, and links
 */
function buildContextMessage(courseContext, relevantPdfChunks) {
  let context = `[COURSE CONTEXT]\n`;
  context += `Course: ${courseContext.course_name}\n`;
  context += `Professor: ${courseContext.professor_name}\n`;

  if (courseContext.learning_goals) {
    context += `Learning Goals: ${courseContext.learning_goals}\n`;
  }

  // Add course links if available
  if (courseContext.links && courseContext.links.length > 0) {
    context += `\n[AVAILABLE COURSE LINKS]\n`;
    courseContext.links.forEach((link) => {
      context += `- "${link.title}": ${link.url}\n`;
      if (link.description) {
        context += `  ${link.description}\n`;
      }
    });
  }

  // Add relevant PDF chunks if available
  if (relevantPdfChunks.length > 0) {
    context += `\n[RELEVANT COURSE MATERIALS FROM PDFs]\n`;
    relevantPdfChunks.forEach((chunk, index) => {
      context += `\n[Reference: "${chunk.filename}" - Page ${chunk.page || 'N/A'}]\n${chunk.content}\n`;
    });
  }

  context += `\n[END CONTEXT]\n\nUse the above course materials and links to provide context-rich guidance. Reference specific materials when relevant to the student's question.`;

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
