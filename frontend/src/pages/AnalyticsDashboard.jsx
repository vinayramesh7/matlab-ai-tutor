import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { analyticsAPI } from '../services/api';

export default function AnalyticsDashboard() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [topics, setTopics] = useState([]);

  // UI states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [courseId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all analytics data in parallel
      const [overviewData, studentsData, topicsData] = await Promise.all([
        analyticsAPI.getCourseOverview(courseId),
        analyticsAPI.getCourseStudents(courseId),
        analyticsAPI.getCourseTopics(courseId)
      ]);

      setOverview(overviewData);
      setStudents(studentsData);
      setTopics(topicsData);
    } catch (err) {
      setError('Failed to load analytics: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (studentId) => {
    try {
      setLoadingStudent(true);
      setSelectedStudent(studentId);

      const details = await analyticsAPI.getStudentDetails(studentId, courseId);
      setStudentDetails(details);
    } catch (err) {
      alert('Failed to load student details: ' + err.message);
      setSelectedStudent(null);
    } finally {
      setLoadingStudent(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMasteryColor = (level) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-primary-600 hover:text-primary-700 mb-2 flex items-center gap-2"
              >
                <span>←</span> Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 Analytics: {overview?.course_name}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Students</div>
            <div className="text-3xl font-bold text-gray-900">{overview?.total_students || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active Students</div>
            <div className="text-3xl font-bold text-green-600">{overview?.active_students || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Questions This Week</div>
            <div className="text-3xl font-bold text-primary-600">{overview?.questions_this_week || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Questions</div>
            <div className="text-3xl font-bold text-gray-900">{overview?.total_questions || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Avg. Mastery</div>
            <div className={`text-3xl font-bold ${getMasteryColor(overview?.average_mastery || 0)}`}>
              {overview?.average_mastery || 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Topic Heatmap */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Topic Distribution</h2>
            {topics.length === 0 ? (
              <p className="text-gray-600 text-sm">No topics data yet. Students haven't asked questions.</p>
            ) : (
              <div className="space-y-3">
                {topics.slice(0, 10).map((topic) => {
                  const maxCount = Math.max(...topics.map(t => t.question_count));
                  const percentage = maxCount > 0 ? (topic.question_count / maxCount) * 100 : 0;

                  return (
                    <div key={topic.topic}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{topic.display_name}</span>
                        <span className="text-gray-600">{topic.question_count} questions</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Activity</h2>
            {students.length === 0 ? (
              <p className="text-gray-600 text-sm">No students enrolled yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleViewStudent(student.id)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-600">{student.email}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(student.status)}`}>
                        {student.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{student.question_count} questions</span>
                      <span className={`font-medium ${getMasteryColor(student.average_mastery)}`}>
                        {student.average_mastery}% mastery
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {loadingStudent ? 'Loading...' : studentDetails?.student?.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingStudent ? (
                  <div className="text-center py-8 text-gray-600">Loading student details...</div>
                ) : studentDetails ? (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Avg. Mastery</div>
                        <div className={`text-2xl font-bold ${getMasteryColor(studentDetails.stats.average_mastery)}`}>
                          {studentDetails.stats.average_mastery}%
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Total Questions</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {studentDetails.stats.total_questions}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">Concepts Explored</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {studentDetails.stats.concepts_explored}
                        </div>
                      </div>
                    </div>

                    {/* Mastery Map */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Concept Mastery</h3>
                      {studentDetails.mastery_map.length === 0 ? (
                        <p className="text-gray-600 text-sm">No mastery data yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {studentDetails.mastery_map.map((concept) => (
                            <div key={concept.concept} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">{concept.concept}</span>
                                <span className={`text-lg font-bold ${getMasteryColor(concept.mastery_level)}`}>
                                  {concept.mastery_level}%
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {concept.questions_asked} questions
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Activity Timeline */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
                      {studentDetails.activity_timeline.length === 0 ? (
                        <p className="text-gray-600 text-sm">No activity yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {studentDetails.activity_timeline.map((activity, idx) => (
                            <div key={idx} className="border-l-2 border-primary-600 pl-4 py-2">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-primary-600">{activity.topic}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(activity.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2">{activity.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
