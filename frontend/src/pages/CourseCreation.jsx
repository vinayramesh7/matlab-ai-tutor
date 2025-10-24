import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { courseAPI, pdfAPI } from '../services/api';

export default function CourseCreation() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const isEditMode = !!courseId;

  const [formData, setFormData] = useState({
    course_name: '',
    description: '',
    teaching_style: '',
    teaching_pace: '',
    learning_goals: '',
  });

  const [pdfs, setPdfs] = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditMode) {
      loadCourse();
      loadPdfs();
    }
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const data = await courseAPI.getById(courseId);
      setFormData({
        course_name: data.course_name,
        description: data.description || '',
        teaching_style: data.teaching_style || '',
        teaching_pace: data.teaching_pace || '',
        learning_goals: data.learning_goals || '',
      });
    } catch (err) {
      setError('Failed to load course');
      console.error(err);
    }
  };

  const loadPdfs = async () => {
    try {
      const data = await pdfAPI.getAll(courseId);
      setPdfs(data);
    } catch (err) {
      console.error('Failed to load PDFs:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isEditMode) {
        await courseAPI.update(courseId, formData);
        setSuccess('Course updated successfully!');
      } else {
        const newCourse = await courseAPI.create(formData);
        setSuccess('Course created successfully!');
        navigate(`/courses/${newCourse.id}/edit`);
      }
    } catch (err) {
      setError(err.message || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isEditMode) {
      alert('Please save the course first before uploading PDFs');
      return;
    }

    setUploadingPdf(true);
    setError('');

    try {
      const newPdf = await pdfAPI.upload(courseId, file);
      setPdfs([...pdfs, newPdf]);
      e.target.value = '';
    } catch (err) {
      setError(err.message || 'Failed to upload PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeletePdf = async (pdfId) => {
    if (!confirm('Are you sure you want to delete this PDF?')) {
      return;
    }

    try {
      await pdfAPI.delete(pdfId);
      setPdfs(pdfs.filter(p => p.id !== pdfId));
    } catch (err) {
      setError(err.message || 'Failed to delete PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Course' : 'Create New Course'}
            </h1>
            <Link
              to="/dashboard"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Course Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="course_name" className="block text-sm font-medium text-gray-700 mb-1">
                Course Name *
              </label>
              <input
                type="text"
                id="course_name"
                name="course_name"
                required
                value={formData.course_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Introduction to MATLAB"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Brief description of the course..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="teaching_style" className="block text-sm font-medium text-gray-700 mb-1">
                  Teaching Style
                </label>
                <select
                  id="teaching_style"
                  name="teaching_style"
                  value={formData.teaching_style}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select style...</option>
                  <option value="socratic">Socratic (Question-based)</option>
                  <option value="direct">Direct (Clear explanations)</option>
                  <option value="exploratory">Exploratory (Discovery-based)</option>
                  <option value="practical">Practical (Hands-on)</option>
                </select>
              </div>

              <div>
                <label htmlFor="teaching_pace" className="block text-sm font-medium text-gray-700 mb-1">
                  Teaching Pace
                </label>
                <select
                  id="teaching_pace"
                  name="teaching_pace"
                  value={formData.teaching_pace}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select pace...</option>
                  <option value="slow">Slow (Step-by-step)</option>
                  <option value="moderate">Moderate (Balanced)</option>
                  <option value="fast">Fast (Quick explanations)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="learning_goals" className="block text-sm font-medium text-gray-700 mb-1">
                Learning Goals
              </label>
              <textarea
                id="learning_goals"
                name="learning_goals"
                rows={3}
                value={formData.learning_goals}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="What should students learn from this course?"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Course' : 'Create Course'}
            </button>
          </form>

          {/* PDF Upload Section (only in edit mode) */}
          {isEditMode && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Materials (PDFs)</h3>

              <div className="mb-4">
                <label className="block">
                  <span className="sr-only">Choose PDF file</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
                  />
                </label>
                {uploadingPdf && (
                  <p className="mt-2 text-sm text-gray-600">Uploading and processing PDF...</p>
                )}
              </div>

              {pdfs.length === 0 ? (
                <p className="text-gray-600 text-sm">No PDFs uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {pdfs.map((pdf) => (
                    <div key={pdf.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">{pdf.filename}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePdf(pdf.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
