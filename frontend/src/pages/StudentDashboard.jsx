import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { signOut } from '../services/supabase';
import { courseAPI } from '../services/api';

export default function StudentDashboard() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
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
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Available Courses</h2>
          <p className="text-gray-600 mt-1">
            Select a course to start learning with your AI tutor
          </p>
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
            <div className="text-gray-600">No courses available yet.</div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {course.course_name}
                </h3>

                <div className="mb-3">
                  <p className="text-sm text-gray-500">
                    Instructor: {course.profiles?.full_name || 'Unknown'}
                  </p>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {course.description || 'No description available'}
                </p>

                {course.learning_goals && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Learning Goals:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{course.learning_goals}</p>
                  </div>
                )}

                <Link
                  to={`/courses/${course.id}/chat`}
                  className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-center font-medium"
                >
                  Open Tutor Chat
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
