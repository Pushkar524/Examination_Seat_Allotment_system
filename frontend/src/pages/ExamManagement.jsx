import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { examsAPI } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function ExamManagement() {
  const { isAdmin } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentExam, setCurrentExam] = useState(null)
  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadErrors, setUploadErrors] = useState([])
  const fileInputRef = useRef(null)
  
  const [examForm, setExamForm] = useState({
    exam_name: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    description: ''
  })

  const [subjectForm, setSubjectForm] = useState({
    subject_name: '',
    subject_code: '',
    exam_date: '',
    start_time: '',
    end_time: ''
  })

  useEffect(() => {
    if (isAdmin) {
      loadExams()
    }
  }, [isAdmin])

  async function loadExams() {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/exams/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setExams(data)
    } catch (error) {
      console.error('Failed to load exams:', error)
      alert('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditMode(false)
    setCurrentExam(null)
    setExamForm({
      exam_name: '',
      exam_date: '',
      start_time: '',
      end_time: '',
      description: ''
    })
    setModalOpen(true)
  }

  function openEditModal(exam) {
    setEditMode(true)
    setCurrentExam(exam)
    setExamForm({
      exam_name: exam.exam_name,
      exam_date: exam.exam_date.split('T')[0],
      start_time: exam.start_time || '',
      end_time: exam.end_time || '',
      description: exam.description || ''
    })
    setModalOpen(true)
  }

  function openSubjectModal(exam) {
    setCurrentExam(exam)
    setSubjectForm({
      subject_name: '',
      subject_code: '',
      exam_date: exam.exam_date.split('T')[0],
      start_time: '',
      end_time: ''
    })
    setSubjectModalOpen(true)
  }

  function openUploadModal(exam) {
    setCurrentExam(exam)
    setUploadModalOpen(true)
    setUploadErrors([])
    setUploadSuccess('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploadErrors([])
    setUploadSuccess('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/exams/exams/${currentExam.id}/subjects/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        } else {
          const text = await response.text()
          console.error('Non-JSON response:', text)
          throw new Error('Server returned an invalid response. Please check the file format.')
        }
      }

      const result = await response.json()
      console.log('Upload result:', result)

      setUploadSuccess(`✓ Successfully imported ${result.successCount} subject(s)`)
      
      if (result.errors && result.errors.length > 0) {
        setUploadErrors(result.errors.map(err => `${err.subject}: ${err.error}`))
      }

      await loadExams()

      if (!result.errorCount || result.errorCount === 0) {
        setTimeout(() => {
          setUploadModalOpen(false)
          setUploadSuccess('')
        }, 2000)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadErrors([error.message || 'Upload failed'])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const url = editMode 
        ? `${API_BASE_URL}/exams/exams/${currentExam.id}`
        : `${API_BASE_URL}/exams/exams`
      
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(examForm)
      })

      if (!response.ok) throw new Error('Failed to save exam')

      await loadExams()
      setModalOpen(false)
      alert(editMode ? 'Exam updated successfully!' : 'Exam created successfully!')
    } catch (error) {
      console.error('Error saving exam:', error)
      alert(error.message || 'Failed to save exam')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSubject(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate subject date is not before exam date
      if (subjectForm.exam_date && currentExam.exam_date) {
        const examDate = new Date(currentExam.exam_date)
        const subjectDate = new Date(subjectForm.exam_date)
        if (subjectDate < examDate) {
          alert('Subject exam date cannot be before the exam date')
          setLoading(false)
          return
        }
      }

      // Validate start time is not before exam start time (applies to all exam dates)
      if (subjectForm.start_time && currentExam.start_time) {
        const examStartMinutes = timeToMinutes(currentExam.start_time)
        const subjectStartMinutes = timeToMinutes(subjectForm.start_time)
        
        if (subjectStartMinutes < examStartMinutes) {
          alert('Subject start time cannot be before exam start time')
          setLoading(false)
          return
        }
      }

      // Validate subject end time does not exceed exam end time (applies to all exam dates)
      if (subjectForm.end_time && currentExam.end_time) {
        const examEndMinutes = timeToMinutes(currentExam.end_time)
        const subjectEndMinutes = timeToMinutes(subjectForm.end_time)
        
        if (subjectEndMinutes > examEndMinutes) {
          alert('Subject end time cannot exceed exam end time')
          setLoading(false)
          return
        }
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/exams/exams/${currentExam.id}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subjectForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add subject')
      }

      await loadExams()
      setSubjectModalOpen(false)
      alert('Subject added successfully!')
    } catch (error) {
      console.error('Error adding subject:', error)
      alert(error.message || 'Failed to add subject')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to convert time string (HH:MM) to minutes
  function timeToMinutes(timeString) {
    if (!timeString) return 0
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Helper function to convert 24-hour time to 12-hour format with AM/PM
  function convertTo12Hour(time24) {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  async function handleDeleteExam(examId) {
    if (!window.confirm('Are you sure you want to delete this exam? This will also delete all associated subjects.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/exams/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete exam')

      await loadExams()
      alert('Exam deleted successfully!')
    } catch (error) {
      console.error('Error deleting exam:', error)
      alert(error.message || 'Failed to delete exam')
    }
  }

  async function handleDeleteSubject(examId, subjectId) {
    if (!window.confirm('Are you sure you want to delete this subject?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/exams/exams/${examId}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete subject')

      await loadExams()
      alert('Subject deleted successfully!')
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert(error.message || 'Failed to delete subject')
    }
  }

  async function handleDeleteAllExams() {
    if (exams.length === 0) {
      alert('No exams to delete')
      return
    }

    if (!window.confirm(`Are you sure you want to delete ALL ${exams.length} exams? This will also delete all associated subjects!`)) {
      return
    }

    if (!window.confirm('This will permanently delete all exams and their subjects. Are you absolutely sure?')) {
      return
    }

    try {
      setLoading(true)
      const result = await examsAPI.deleteAllExams()
      await loadExams()
      alert(result.message || 'All exams deleted successfully!')
    } catch (error) {
      console.error('Error deleting all exams:', error)
      alert(error.message || 'Failed to delete all exams')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          Access Denied: Admin privileges required
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            📅 Exam Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create and manage exams with subjects and schedules
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <span>➕</span> Create New Exam
          </button>
          <button
            onClick={handleDeleteAllExams}
            disabled={loading || exams.length === 0}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            {loading ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading exams...</div>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No exams found. Create your first exam to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {exam.exam_name}
                  </h2>
                  <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>📅 {new Date(exam.exam_date).toLocaleDateString()}</span>
                    {exam.start_time && <span>🕐 {convertTo12Hour(exam.start_time)}</span>}
                    {exam.end_time && <span>🕐 {convertTo12Hour(exam.end_time)}</span>}
                  </div>
                  {exam.description && (
                    <p className="mt-2 text-gray-600 dark:text-gray-400">{exam.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openSubjectModal(exam)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    ➕ Add Subject
                  </button>
                  <button
                    onClick={() => openUploadModal(exam)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    📁 Upload CSV
                  </button>
                  <button
                    onClick={() => openEditModal(exam)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Subjects */}
              {exam.subjects && exam.subjects.length > 0 && (
                <div className="mt-4 border-t dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Subjects:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exam.subjects.map(subject => (
                      <div key={subject.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">
                            {subject.subject_name}
                          </p>
                          {subject.subject_code && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Code: {subject.subject_code}
                            </p>
                          )}
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {subject.exam_date && <span>📅 {new Date(subject.exam_date).toLocaleDateString()}</span>}
                            {subject.start_time && <span className="ml-3">🕐 {convertTo12Hour(subject.start_time)}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSubject(exam.id, subject.id)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Exam Modal */}
      <Modal open={modalOpen} title={editMode ? '✏️ Edit Exam' : '➕ Create New Exam'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam Name *
            </label>
            <input
              type="text"
              value={examForm.exam_name}
              onChange={(e) => setExamForm({...examForm, exam_name: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
              placeholder="e.g., Mid-Term Examination 2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Exam Date *
              </label>
              <input
                type="date"
                value={examForm.exam_date}
                onChange={(e) => setExamForm({...examForm, exam_date: e.target.value})}
                className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={examForm.start_time}
                onChange={(e) => setExamForm({...examForm, start_time: e.target.value})}
                className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={examForm.end_time}
              onChange={(e) => setExamForm({...examForm, end_time: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={examForm.description}
              onChange={(e) => setExamForm({...examForm, description: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              rows="3"
              placeholder="Additional exam details..."
            />
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
            >
              <span>✓</span> {loading ? 'Saving...' : editMode ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal open={subjectModalOpen} title="➕ Add Subject" onClose={() => setSubjectModalOpen(false)}>
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Name *
            </label>
            <input
              type="text"
              value={subjectForm.subject_name}
              onChange={(e) => setSubjectForm({...subjectForm, subject_name: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
              placeholder="e.g., Mathematics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Code
            </label>
            <input
              type="text"
              value={subjectForm.subject_code}
              onChange={(e) => setSubjectForm({...subjectForm, subject_code: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., MATH101"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Exam Date
            </label>
            <input
              type="date"
              value={subjectForm.exam_date}
              onChange={(e) => setSubjectForm({...subjectForm, exam_date: e.target.value})}
              min={currentExam?.exam_date?.split('T')[0]}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            {currentExam?.exam_date && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be on or after {new Date(currentExam.exam_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={subjectForm.start_time}
                onChange={(e) => setSubjectForm({...subjectForm, start_time: e.target.value})}
                className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              {currentExam?.start_time && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Must not be before {convertTo12Hour(currentExam.start_time)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={subjectForm.end_time}
                onChange={(e) => setSubjectForm({...subjectForm, end_time: e.target.value})}
                className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              {currentExam?.end_time && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Must not exceed {convertTo12Hour(currentExam.end_time)}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setSubjectModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
            >
              <span>✓</span> {loading ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Subjects CSV Modal */}
      <Modal open={uploadModalOpen} title="📁 Upload Subjects from CSV" onClose={() => setUploadModalOpen(false)}>
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">📋 CSV File Format Requirements</h4>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">Your CSV file must contain the following columns:</p>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700 text-sm font-mono">
              subject_name, subject_code, exam_date, start_time, end_time
            </div>
            <div className="mt-3 space-y-1 text-sm text-blue-800 dark:text-blue-300">
              <p>• <strong>subject_name</strong>: Name of the subject (required)</p>
              <p>• <strong>subject_code</strong>: Subject code (e.g., MATH101)</p>
              <p>• <strong>exam_date</strong>: Format: YYYY-MM-DD (must be ≥ exam date)</p>
              <p>• <strong>start_time</strong>: Format: HH:MM (e.g., 09:00)</p>
              <p>• <strong>end_time</strong>: Format: HH:MM (must not exceed exam end time if same date)</p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
            <h5 className="text-sm font-semibold mb-2 dark:text-white">Example content:</h5>
            <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border dark:border-gray-700 overflow-x-auto dark:text-gray-300">
{`subject_name,subject_code,exam_date,start_time,end_time
Mathematics,MATH101,2025-12-12,09:00,11:00
Physics,PHY101,2025-12-12,13:00,15:00
Chemistry,CHEM101,2025-12-13,09:00,11:00`}
            </pre>
          </div>

          {/* Download Sample */}
          <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-3 rounded">
            <p className="text-sm text-green-800 dark:text-green-300 mb-2">
              💡 Download the sample CSV file to use as a template
            </p>
            <a
              href="/sample-data/subjects_sample.csv"
              download="subjects_sample.csv"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded transition"
            >
              📥 Download Sample CSV
            </a>
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select CSV File
            </label>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer disabled:opacity-50 dark:file:bg-purple-900 dark:file:text-purple-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Accepted format: .csv</p>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-800 dark:text-green-200 font-medium">{uploadSuccess}</p>
            </div>
          )}

          {/* Error Messages */}
          {uploadErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">⚠️ Upload Issues</h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {uploadErrors.map((err, idx) => (
                  <li key={idx} className="font-mono text-xs">• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
