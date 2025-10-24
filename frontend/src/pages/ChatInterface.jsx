import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { courseAPI, chatAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';

export default function ChatInterface() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadCourse();
    loadChatHistory();
  }, [courseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCourse = async () => {
    try {
      const data = await courseAPI.getById(courseId);
      setCourse(data);
    } catch (err) {
      setError('Failed to load course');
      console.error(err);
    }
  };

  const loadChatHistory = async () => {
    try {
      const history = await chatAPI.getHistory(courseId);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setError('');

    // Add user message to UI immediately
    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Prepare conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Send message to API
      const response = await chatAPI.sendMessage(courseId, userMessage, conversationHistory);

      // Add assistant response to UI
      const assistantMsg = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Show relevant materials if any
      if (response.relevant_materials && response.relevant_materials.length > 0) {
        console.log('Referenced materials:', response.relevant_materials);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
      // Remove the temporary user message on error
      setMessages(prev => prev.slice(0, -1));
      // Restore input
      setInputMessage(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear the conversation history?')) {
      return;
    }

    try {
      await chatAPI.clearHistory(courseId);
      setMessages([]);
    } catch (err) {
      setError('Failed to clear history');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Link
                to="/dashboard"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                {course?.course_name || 'Loading...'}
              </h1>
              {course?.profiles && (
                <p className="text-sm text-gray-600">
                  Instructor: {course.profiles.full_name}
                </p>
              )}
            </div>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear History
            </button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col px-4 sm:px-6 lg:px-8">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            {loadingHistory ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-block p-6 bg-white rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Welcome to your AI MATLAB Tutor!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Ask me anything about MATLAB and I'll guide you through learning step-by-step.
                  </p>
                  <div className="text-left space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Try asking:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• "How do I create a matrix in MATLAB?"</li>
                      <li>• "What's the difference between a row and column vector?"</li>
                      <li>• "Help me understand loops in MATLAB"</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {msg.role === 'user' ? profile?.full_name || 'You' : 'AI Tutor'}
                          </span>
                          <span className="text-xs opacity-50">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-3xl rounded-lg px-4 py-3 bg-white shadow-md">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <span className="text-sm text-gray-600">AI Tutor is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 py-4">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loading}
                placeholder="Ask your MATLAB question..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
