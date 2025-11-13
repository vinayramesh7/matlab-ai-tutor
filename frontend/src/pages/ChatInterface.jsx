import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { courseAPI, chatAPI, pdfAPI } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import PDFViewer from '../components/PDFViewer';
import MatlabEditor from '../components/MatlabEditor';

export default function ChatInterface() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [course, setCourse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [pdfs, setPdfs] = useState([]);
  const [showPdfOverlay, setShowPdfOverlay] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);
  const [editorCode, setEditorCode] = useState('% Write your MATLAB code here\n\n');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [hoveredCode, setHoveredCode] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadCourse();
    loadChatHistory();
    loadPDFs();
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

  const loadPDFs = async () => {
    try {
      const data = await pdfAPI.getAll(courseId);
      setPdfs(data);
    } catch (err) {
      console.error('Failed to load PDFs:', err);
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

  const handlePdfReferenceClick = (filename, page) => {
    console.log(`PDF reference clicked: ${filename}, page ${page}`);
    const pdf = pdfs.find(p => p.filename === filename);
    if (pdf) {
      setSelectedPdf(pdf);
      setSelectedPage(page);
      setShowPdfOverlay(true);
    } else {
      console.warn(`PDF not found: ${filename}`);
      alert(`PDF "${filename}" not found in course materials.`);
    }
  };

  const renderMessageContent = (content) => {
    // First, parse code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2].trim();
      parts.push({
        type: 'code',
        language,
        code
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    // If no code blocks, treat entire content as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    // Now render parts, parsing PDF references in text parts
    return (
      <div className="space-y-2">
        {parts.map((part, idx) => {
          if (part.type === 'code') {
            return (
              <div key={idx} className="relative">
                <button
                  onClick={() => handleInsertCode(part.code)}
                  onMouseEnter={() => setHoveredCode(part.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  className="absolute top-3 right-3 z-10 p-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
                  title="Insert into editor"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <SyntaxHighlighter
                  language={part.language}
                  style={vs}
                  customStyle={{
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    paddingRight: '3rem',
                    fontSize: '0.875rem',
                    margin: '0.5rem 0',
                    backgroundColor: '#f6f8fa',
                    border: '1px solid #e1e4e8'
                  }}
                >
                  {part.code}
                </SyntaxHighlighter>
              </div>
            );
          } else {
            // Parse PDF references in text
            return <span key={idx}>{renderTextWithPdfRefs(part.content)}</span>;
          }
        })}
      </div>
    );
  };

  const renderTextWithPdfRefs = (text) => {
    const pdfRefRegex = /\[Reference: "([^"]+)" - Page ([\d\-]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = pdfRefRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      const [fullMatch, filename, pageStr] = match;

      // Handle page ranges: "29-31" -> link to page 29
      const firstPage = pageStr.includes('-')
        ? parseInt(pageStr.split('-')[0])
        : parseInt(pageStr);

      parts.push({
        type: 'pdf_ref',
        filename,
        page: firstPage,
        pageDisplay: pageStr,
        fullMatch
      });

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    if (parts.length === 0) {
      return <span className="whitespace-pre-wrap break-words">{text}</span>;
    }

    return (
      <span className="whitespace-pre-wrap break-words">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <span key={idx}>{part.content}</span>;
          } else if (part.type === 'pdf_ref') {
            return (
              <button
                key={idx}
                onClick={() => handlePdfReferenceClick(part.filename, part.page)}
                className="inline-flex items-center px-2 py-1 mx-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title={`Click to view ${part.filename} page ${part.pageDisplay || part.page}`}
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {part.filename} - Page {part.pageDisplay || part.page}
              </button>
            );
          }
          return null;
        })}
      </span>
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setError('');

    const tempUserMsg = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await chatAPI.sendMessage(courseId, userMessage, conversationHistory);

      const assistantMsg = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.relevant_materials && response.relevant_materials.length > 0) {
        console.log('Referenced materials:', response.relevant_materials);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
      setInputMessage(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStarterPromptClick = async (prompt) => {
    if (loading) return;

    setInputMessage('');
    setLoading(true);
    setError('');

    const tempUserMsg = {
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await chatAPI.sendMessage(courseId, prompt, conversationHistory);

      const assistantMsg = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.relevant_materials && response.relevant_materials.length > 0) {
        console.log('Referenced materials:', response.relevant_materials);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleInsertCode = (code) => {
    setEditorCode(code);
    setHoveredCode(null);
  };

  const handleSubmitCode = async () => {
    if (!editorCode.trim() || loading) return;

    const codeSubmission = `Can you review my code and provide feedback?\n\n\`\`\`matlab\n${editorCode.trim()}\n\`\`\``;

    setLoading(true);
    setError('');

    const tempUserMsg = {
      role: 'user',
      content: codeSubmission,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await chatAPI.sendMessage(courseId, codeSubmission, conversationHistory);

      const assistantMsg = {
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.relevant_materials && response.relevant_materials.length > 0) {
        console.log('Referenced materials:', response.relevant_materials);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit code');
      setMessages(prev => prev.slice(0, -1));
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
      {/* Full-width Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-lg font-bold text-gray-900">
                  {course?.course_name || 'Loading...'}
                </h1>
                {course?.profiles && (
                  <p className="text-xs text-gray-600">
                    Instructor: {course.profiles.full_name}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear History
            </button>
          </div>
        </div>
      </header>

      {/* Main content with resizable panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Chat Panel */}
          <Panel defaultSize={50} minSize={20} collapsible={true} onCollapse={setLeftCollapsed}>
            <div className="h-full flex flex-col bg-white">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading conversation...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="max-w-md text-center p-8 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Welcome to your AI MATLAB Tutor!
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        Ask me anything about MATLAB and I'll guide you through learning step-by-step.
                      </p>
                      <div className="text-left space-y-2">
                        <p className="text-sm text-gray-700 font-medium">Try asking:</p>
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li>
                            <button
                              onClick={() => handleStarterPromptClick("How do I create a matrix in MATLAB?")}
                              className="text-left w-full px-3 py-2 rounded hover:bg-gray-200 transition-colors text-primary-600 hover:text-primary-700"
                            >
                              • "How do I create a matrix in MATLAB?"
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleStarterPromptClick("Help me understand loops in MATLAB")}
                              className="text-left w-full px-3 py-2 rounded hover:bg-gray-200 transition-colors text-primary-600 hover:text-primary-700"
                            >
                              • "Help me understand loops in MATLAB"
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleStarterPromptClick("What's the difference between a row and column vector?")}
                              className="text-left w-full px-3 py-2 rounded hover:bg-gray-200 transition-colors text-primary-600 hover:text-primary-700"
                            >
                              • "What's the difference between a row and column vector?"
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className="flex justify-start"
                    >
                      <div
                        className={`max-w-3xl rounded-lg px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-[#deefff] text-gray-900'
                            : 'bg-gray-100 text-gray-900'
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
                            {renderMessageContent(msg.content)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl rounded-lg px-4 py-3 bg-gray-100">
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
                <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Input Area */}
              <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-100">
                <form onSubmit={handleSendMessage} className="relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={loading}
                    placeholder="Ask your MATLAB question..."
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-primary-600 hover:text-primary-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-primary-500 transition-colors cursor-col-resize" />

          {/* Editor/PDF Panel */}
          <Panel defaultSize={50} minSize={20} collapsible={true} onCollapse={setRightCollapsed}>
            <div className="h-full flex flex-col bg-white border-l border-gray-200">
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">MATLAB Editor</h3>
                  <p className="text-xs text-gray-500">Write your code here, then click Review Code</p>
                </div>
                <button
                  onClick={handleSubmitCode}
                  disabled={loading || !editorCode.trim()}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  title="Review your code with AI"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Review Code</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <MatlabEditor
                  value={editorCode}
                  onChange={(value) => setEditorCode(value || '')}
                />
                {hoveredCode && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 pointer-events-none">
                    <div className="p-4 font-mono text-sm text-gray-400 whitespace-pre-wrap">
                      {hoveredCode}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* PDF Overlay */}
      {showPdfOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedPdf?.filename} - Page {selectedPage}
              </h2>
              <button
                onClick={() => setShowPdfOverlay(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PDFViewer
                pdfUrl={selectedPdf?.file_url}
                initialPage={selectedPage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
