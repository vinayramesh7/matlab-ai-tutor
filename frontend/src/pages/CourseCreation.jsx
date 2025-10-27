import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { courseAPI, pdfAPI, linkAPI } from '../services/api';

export default function CourseCreation() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const isEditMode = !!courseId;

  const [formData, setFormData] = useState({
    course_name: '',
    description: '',
    learning_goals: '',
  });

  const [pdfs, setPdfs] = useState([]);
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', description: '' });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditMode) {
      loadCourse();
      loadPdfs();
      loadLinks();
    }
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const data = await courseAPI.getById(courseId);
      setFormData({
        course_name: data.course_name,
        description: data.description || '',
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

  const loadLinks = async () => {
    try {
      const data = await linkAPI.getAll(courseId);
      setLinks(data);
    } catch (err) {
      console.error('Failed to load links:', err);
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
        // Create course
        const newCourse = await courseAPI.create(formData);

        // Create all links for the new course
        if (links.length > 0) {
          await Promise.all(
            links.map(link => linkAPI.add(newCourse.id, link))
          );
        }

        setSuccess('Course created successfully! You can now upload PDFs.');
        // Navigate to edit mode to allow PDF uploads
        navigate(`/courses/${newCourse.id}/edit`);
      }
    } catch (err) {
      setError(err.message || 'Failed to save course. Please try logging in again.');
      console.error('Course save error:', err);
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

  const handleAddLink = async (e) => {
    e.preventDefault();

    if (!newLink.title || !newLink.url) {
      setError('Link title and URL are required');
      return;
    }

    setError('');

    if (isEditMode) {
      // In edit mode, save to database immediately
      setAddingLink(true);
      try {
        const addedLink = await linkAPI.add(courseId, newLink);
        setLinks([...links, addedLink]);
        setNewLink({ title: '', url: '', description: '' });
      } catch (err) {
        setError(err.message || 'Failed to add link');
      } finally {
        setAddingLink(false);
      }
    } else {
      // In create mode, just add to local state
      setLinks([...links, { ...newLink, id: Date.now() }]); // Temporary ID
      setNewLink({ title: '', url: '', description: '' });
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }

    if (isEditMode) {
      // In edit mode, delete from database
      try {
        await linkAPI.delete(linkId);
        setLinks(links.filter(l => l.id !== linkId));
      } catch (err) {
        setError(err.message || 'Failed to delete link');
      }
    } else {
      // In create mode, just remove from local state
      setLinks(links.filter(l => l.id !== linkId));
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
              <p className="mt-1 text-xs text-gray-500">
                Note: The AI tutor uses a Socratic teaching method to guide students through discovery
              </p>
            </div>
          </form>

          {/* Course Links Section (always visible) */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Links & Resources (Optional)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add external links to MATLAB documentation, tutorials, or other learning resources. The AI tutor will reference these when helping students.
            </p>

            {/* Add Link Form */}
            <form onSubmit={handleAddLink} className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid gap-3">
                <div>
                  <label htmlFor="link_title" className="block text-sm font-medium text-gray-700 mb-1">
                    Link Title *
                  </label>
                  <input
                    type="text"
                    id="link_title"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="e.g., MATLAB Arrays Documentation"
                    disabled={addingLink}
                  />
                </div>
                <div>
                  <label htmlFor="link_url" className="block text-sm font-medium text-gray-700 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    id="link_url"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="https://..."
                    disabled={addingLink}
                  />
                </div>
                <div>
                  <label htmlFor="link_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="link_description"
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Brief description of this resource..."
                    disabled={addingLink}
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingLink || !newLink.title || !newLink.url}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {addingLink ? 'Adding...' : 'Add Link'}
                </button>
              </div>
            </form>

            {/* Links List */}
            {links.length === 0 ? (
              <p className="text-gray-600 text-sm">No links added yet.</p>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div key={link.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {link.title}
                        </a>
                      </div>
                      {link.description && (
                        <p className="text-xs text-gray-600 mt-1 ml-6">{link.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 ml-6 truncate">{link.url}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium ml-4 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save/Create Button */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Course' : 'Create Course'}
            </button>
            {!isEditMode && links.length > 0 && (
              <p className="mt-2 text-sm text-gray-600 text-center">
                {links.length} link{links.length !== 1 ? 's' : ''} will be added to the course
              </p>
            )}
          </div>

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
