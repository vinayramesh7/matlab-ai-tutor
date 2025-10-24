import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { signOut } from '../services/supabase';
import { courseAPI } from '../services/api';

export default function ProfessorDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await courseAPI.getAll();
      setCourses(data);
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      await courseAPI.delete(courseId);
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err) {
      alert('Failed to delete course: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Professor Dashboard</h1>
              <p className="text-gray-600">Welcome, {profile?.full_name}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
          <Link
            to="/courses/create"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            + Create Course
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading courses...</div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-600 mb-4">You haven't created any courses yet.</div>
            <Link
              to="/courses/create"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Create Your First Course
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {course.course_name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {course.description || 'No description'}
                </p>

                <div className="space-y-2 mb-4">
                  {course.teaching_style && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Style:</span>{' '}
                      <span className="text-gray-600">{course.teaching_style}</span>
                    </div>
                  )}
                  {course.teaching_pace && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Pace:</span>{' '}
                      <span className="text-gray-600">{course.teaching_pace}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/courses/${course.id}/edit`}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
