import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { deptSubjectsAPI, uploadAPI } from '../services/api'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function PatternAllotment() {
  const { isAdmin } = useAuth()
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [departments, setDepartments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [mappings, setMappings] = useState({}) // { department: subjectId }
  const [selectedPattern, setSelectedPattern] = useState('pattern1')
  const [rooms, setRooms] = useState([])
  const [selectedRooms, setSelectedRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Select Exam, 2: Map Subjects, 3: Choose Pattern & Allot
  
  // Allotment list state
  const [allotments, setAllotments] = useState([])
  const [allotmentSearchTerm, setAllotmentSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  // Toast notification state
  const [toast, setToast] = useState(null)

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'OK',
    cancelText: 'Cancel',
    type: 'warning'
  })

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const closeToast = () => {
    setToast(null)
  }

  const showConfirm = (title, message, onConfirm, type = 'warning', confirmText = 'OK', cancelText = 'Cancel') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      type
    })
  }

  const closeConfirm = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false })
  }

  const handleConfirm = () => {
    confirmDialog.onConfirm()
    closeConfirm()
  }

  useEffect(() => {
    if (isAdmin) {
      loadInitialData()
    }
  }, [isAdmin])

  async function loadInitialData() {
    try {
      setLoading(true)
      const [examsData, departmentsData, roomsData] = await Promise.all([
        loadExams(),
        deptSubjectsAPI.getDepartments(),
        uploadAPI.getRooms()
      ])
      setDepartments(departmentsData)
      setRooms(roomsData)
      await loadAllotments()
    } catch (error) {
      console.error('Failed to load initial data:', error)
      showToast('Failed to load data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllotments() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/allotment/allotments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to load allotments')
      
      const data = await response.json()
      setAllotments(data)
    } catch (error) {
      console.error('Error loading allotments:', error)
    }
  }

  async function loadExams() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/exams/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to load exams')
      
      const data = await response.json()
      setExams(data)
      return data
    } catch (error) {
      console.error('Error loading exams:', error)
      throw error
    }
  }

  async function handleExamSelect(exam) {
    setSelectedExam(exam)
    setSubjects(exam.subjects || [])
    
    // Load existing mappings
    try {
      const existingMappings = await deptSubjectsAPI.getDepartmentSubjects(exam.id)
      const mappingsObj = {}
      existingMappings.forEach(m => {
        mappingsObj[m.department] = m.subject_id
      })
      setMappings(mappingsObj)
    } catch (error) {
      console.error('Failed to load existing mappings:', error)
      setMappings({})
    }
    
    setStep(2)
  }

  function handleMappingChange(department, subjectId) {
    setMappings(prev => ({
      ...prev,
      [department]: parseInt(subjectId)
    }))
  }

  async function handleSaveMappings() {
    if (Object.keys(mappings).length === 0) {
      showToast('Please map at least one department to a subject', 'warning')
      return
    }

    try {
      setLoading(true)
      const mappingsArray = Object.entries(mappings).map(([department, subject_id]) => ({
        department,
        subject_id
      }))
      
      await deptSubjectsAPI.bulkUpdateDepartmentSubjects(selectedExam.id, mappingsArray)
      showToast('Subject mappings saved successfully!', 'success')
      setStep(3)
    } catch (error) {
      console.error('Failed to save mappings:', error)
      showToast('Failed to save mappings: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleRoomToggle(roomId) {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId)
      } else {
        return [...prev, roomId]
      }
    })
  }

  async function handlePerformAllotment() {
    if (!selectedPattern) {
      showToast('Please select a pattern', 'warning')
      return
    }

    showConfirm(
      'Confirm Seat Allotment',
      `Perform seat allotment using ${selectedPattern === 'pattern1' ? 'Pattern 1 (Alternating Columns by Subject)' : 'Pattern 2 (Alternate/Mixed Departments)'}?\n\nThis will delete existing allotments for this exam.`,
      async () => {
        try {
          setLoading(true)
          const roomIds = selectedRooms.length > 0 ? selectedRooms : null
          const result = await deptSubjectsAPI.performSeatAllotment(selectedExam.id, selectedPattern, roomIds)
          
          const successMessage = `Seat allotment completed successfully!\n\n` +
        `Students allocated: ${result.allocatedCount}/${result.totalStudents}\n` +
        `Pattern: ${selectedPattern}\n` +
        `Rooms used: ${result.totalRooms}\n` +
        `Capacity utilization: ${result.utilizationPercentage}%`
      
      showToast(successMessage, 'success')
      
      // Reload allotments
      await loadAllotments()
      
      // Reset
      setSelectedExam(null)
      setMappings({})
      setSelectedRooms([])
      setStep(1)
    } catch (error) {
      console.error('Allotment failed:', error)
      
      // Check if error has detailed information
      if (error.response?.data?.details) {
        const details = error.response.data.details
        const errorMessage = `${error.response.data.error}\n\n` +
          `Total students: ${details.totalStudents}\n` +
          `Available seats: ${details.availableSeats}\n` +
          `Shortage: ${details.shortageOfSeats || details.studentsUnallocated} seats\n` +
          `Additional rooms needed: ${details.additionalRoomsNeeded}\n\n` +
          `${details.message}\n\n` +
          (details.unallocatedStudentsList ? 
            `First unallocated students:\n${details.unallocatedStudentsList.map(s => `• ${s.rollNo} (${s.department})`).join('\n')}` 
            : '')
        
        showToast(errorMessage, 'error')
      } else {
        showToast('Failed to perform allotment: ' + (error.response?.data?.error || error.message), 'error')
      }
    } finally {
      setLoading(false)
    }
      },
      'warning',
      'OK',
      'Cancel'
    )
  }

  async function handleDeleteAllAllotments() {
    showConfirm(
      'localhost:5173 says',
      `Are you sure you want to delete ALL ${allotments.length} seat allotments? This action cannot be undone!`,
      () => {
        showConfirm(
          'localhost:5173 says',
          'This will permanently delete all seat assignments. Are you absolutely sure?',
          async () => {
            try {
              setLoading(true)
              
              const token = localStorage.getItem('token')
              
              // Delete all allotments one by one
              for (const allotment of allotments) {
                await fetch(`${API_BASE_URL}/allotment/allotments/${allotment.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`
          }
        })
      }
      
      await loadAllotments()
      showToast('All seat allotments deleted successfully!', 'success')
    } catch (error) {
      console.error('Delete all failed:', error)
      showToast(error.message || 'Failed to delete all allotments', 'error')
    } finally {
      setLoading(false)
    }
          },
          'danger',
          'Delete',
          'Cancel'
        )
      },
      'danger',
      'OK',
      'Cancel'
    )
  }

  // Filter allotments based on search and filters
  const filteredAllotments = allotments.filter(a => {
    const matchesSearch = !allotmentSearchTerm || 
      a.roll_no?.toLowerCase().includes(allotmentSearchTerm.toLowerCase()) ||
      a.student_name?.toLowerCase().includes(allotmentSearchTerm.toLowerCase())
    
    const matchesCourse = !courseFilter || a.department?.includes(courseFilter)
    const matchesRoom = !roomFilter || a.room_no?.includes(roomFilter)
    
    return matchesSearch && matchesCourse && matchesRoom
  })

  // Get unique values for filter dropdowns
  const uniqueCourses = [...new Set(allotments.map(a => a.department).filter(c => c))]
  const uniqueRooms = [...new Set(allotments.map(a => a.room_no).filter(r => r))]

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
    <div className="max-w-7xl mx-auto p-6 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          🎯 Pattern-Based Seat Allotment
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Assign subjects to departments and allocate seats using Pattern 1 or Pattern 2
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 1 ? 'bg-blue-500 text-white' : step > 1 ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
          <span className="font-bold">1</span>
          <span>Select Exam</span>
        </div>
        <div className="text-gray-400">→</div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 2 ? 'bg-blue-500 text-white' : step > 2 ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
          <span className="font-bold">2</span>
          <span>Map Subjects</span>
        </div>
        <div className="text-gray-400">→</div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
          <span className="font-bold">3</span>
          <span>Choose Pattern & Allot</span>
        </div>
      </div>

      {/* Step 1: Select Exam */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            📝 Select an Exam
          </h2>
          
          {exams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No exams found. Create an exam first in Exam Management.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => (
                <button
                  key={exam.id}
                  onClick={() => handleExamSelect(exam)}
                  className="text-left p-4 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg transition-all bg-white dark:bg-gray-700"
                >
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    {exam.exam_name}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>📅 {new Date(exam.exam_date).toLocaleDateString()}</p>
                    {exam.subjects && exam.subjects.length > 0 && (
                      <p>📚 {exam.subjects.length} subject(s)</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Map Subjects to Departments */}
      {step === 2 && selectedExam && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              🔗 Map Subjects to Departments
            </h2>
            <button
              onClick={() => {
                setStep(1)
                setSelectedExam(null)
                setMappings({})
              }}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg"
            >
              ← Back
            </button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>Exam:</strong> {selectedExam.exam_name}
            </p>
            <p className="text-blue-800 dark:text-blue-200 text-sm mt-1">
              Assign one subject to each department. Students from each department will be allocated seats for their assigned subject.
            </p>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No subjects found for this exam. Add subjects first in Exam Management.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {departments.map(dept => (
                  <div key={dept} className="flex items-center gap-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {dept}
                      </label>
                    </div>
                    <div className="flex-1">
                      <select
                        value={mappings[dept] || ''}
                        onChange={(e) => handleMappingChange(dept, e.target.value)}
                        className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">-- Select Subject --</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.subject_name} ({subject.subject_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveMappings}
                  disabled={loading || Object.keys(mappings).length === 0}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Choose Pattern and Perform Allotment */}
      {step === 3 && selectedExam && (
        <div className="space-y-6">
          {/* Pattern Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              🎨 Choose Allotment Pattern
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Pattern 1 */}
              <button
                onClick={() => setSelectedPattern('pattern1')}
                className={`p-6 border-2 rounded-lg transition-all text-left ${
                  selectedPattern === 'pattern1'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPattern === 'pattern1' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                  }`}>
                    {selectedPattern === 'pattern1' && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    Pattern 1: Alternating Columns
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Students with different subjects are alternated by column (seat position) within each room. Subject A gets even seats (1, 3, 5...), Subject B gets odd seats (2, 4, 6...) to prevent students with same subject sitting next to each other.
                </p>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                  Example: Room 1: [Seat 1: A1, Seat 2: B1, Seat 3: A2, Seat 4: B2...]
                </div>
              </button>

              {/* Pattern 2 */}
              <button
                onClick={() => setSelectedPattern('pattern2')}
                className={`p-6 border-2 rounded-lg transition-all text-left ${
                  selectedPattern === 'pattern2'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPattern === 'pattern2' ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                  }`}>
                    {selectedPattern === 'pattern2' && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    Pattern 2: Alternate/Mixed
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Students from different departments are mixed alternately. One student from each department in rotation.
                </p>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                  Example: Room 1: [A1, B1, C1, A2, B2, C2, A3, B3...]
                </div>
              </button>
            </div>
          </div>

          {/* Room Selection (Optional) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              🏛️ Select Rooms (Optional)
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Leave empty to use all available rooms, or select specific rooms for this exam.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => handleRoomToggle(room.id)}
                  className={`p-3 border-2 rounded-lg transition-all ${
                    selectedRooms.includes(room.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="font-bold text-gray-800 dark:text-white">{room.room_no}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Floor {room.floor} • {room.capacity} seats
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-semibold"
              >
                ← Back to Mappings
              </button>
              <button
                onClick={handlePerformAllotment}
                disabled={loading || !selectedPattern}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-bold text-lg shadow-lg"
              >
                {loading ? '⏳ Allocating...' : '🚀 Perform Seat Allotment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allotment List Section */}
      {allotments.length > 0 && (
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                📋 All Seat Allotments
              </h2>
              {isAdmin && (
                <button
                  onClick={handleDeleteAllAllotments}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>🗑️</span>
                  {loading ? 'Deleting...' : 'Delete All Allotments'}
                </button>
              )}
            </div>

            {/* Search and Filter Bar */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <input 
                value={allotmentSearchTerm} 
                onChange={e => setAllotmentSearchTerm(e.target.value)} 
                placeholder="🔍 Search by Student Name or Roll No" 
                className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
              <select 
                value={courseFilter} 
                onChange={e => setCourseFilter(e.target.value)} 
                className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Departments</option>
                {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={roomFilter} 
                onChange={e => setRoomFilter(e.target.value)} 
                className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Rooms</option>
                {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Allotments Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border dark:border-gray-600 p-3 text-left font-semibold dark:text-white">Roll No</th>
                    <th className="border dark:border-gray-600 p-3 text-left font-semibold dark:text-white">Student Name</th>
                    <th className="border dark:border-gray-600 p-3 text-left font-semibold dark:text-white">Department</th>
                    <th className="border dark:border-gray-600 p-3 text-left font-semibold dark:text-white">Room No</th>
                    <th className="border dark:border-gray-600 p-3 text-left font-semibold dark:text-white">Floor</th>
                    <th className="border dark:border-gray-600 p-3 text-left font-semibold dark:text-white">Seat No</th>
                    {isAdmin && <th className="border dark:border-gray-600 p-3 text-center font-semibold dark:text-white">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAllotments.length === 0 ? (
                    <tr className="h-20">
                      <td className="border dark:border-gray-600 p-4 text-center text-gray-500 dark:text-gray-400" colSpan={isAdmin ? 7 : 6}>
                        No matching allotments found
                      </td>
                    </tr>
                  ) : (
                    filteredAllotments.map(a => (
                      <tr key={a.id} className="h-12 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="border dark:border-gray-600 p-2 font-mono dark:text-gray-200">{a.roll_no}</td>
                        <td className="border dark:border-gray-600 p-2 font-medium dark:text-gray-200">{a.student_name}</td>
                        <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{a.department}</td>
                        <td className="border dark:border-gray-600 p-2">
                          <span className="bg-cyan-100 dark:bg-cyan-900 px-2 py-1 rounded text-cyan-800 dark:text-cyan-200 font-semibold">
                            {a.room_no}
                          </span>
                        </td>
                        <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{a.floor}</td>
                        <td className="border dark:border-gray-600 p-2">
                          <span className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded text-purple-800 dark:text-purple-200 font-semibold">
                            {a.seat_number}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="border dark:border-gray-600 p-2">
                            <div className="flex gap-2 justify-center">
                              <button 
                                onClick={() => {
                                  showConfirm(
                                    'Confirm Delete',
                                    'Are you sure you want to delete this student? This action cannot be undone.',
                                    async () => {
                                      try {
                                        const token = localStorage.getItem('token')
                                        const response = await fetch(`${API_BASE_URL}/allotment/allotments/${a.id}`, {
                                          method: 'DELETE',
                                          headers: {
                                            'Authorization': `Bearer ${token}`
                                          }
                                        })
                                        
                                        if (!response.ok) throw new Error('Failed to delete')
                                        
                                        await loadAllotments()
                                        showToast('Allotment deleted successfully', 'success')
                                      } catch (error) {
                                        showToast(error.message || 'Failed to delete', 'error')
                                      }
                                    },
                                    'danger',
                                    'Delete',
                                    'Cancel'
                                  )
                                }}
                                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-sm transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAllotments.length} of {allotments.length} total allotments
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
          duration={5000}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
      />
    </div>
  )
}
