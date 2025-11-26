import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import SeatGrid from '../components/SeatGrid'
import Modal from '../components/Modal'
import { uploadAPI, allotmentAPI } from '../services/api'

/**
 * Visual Seat Selection Page
 * Allows admins to select seats visually and assign students
 * Similar to bus/movie ticket booking interface
 */
export default function VisualSeatSelection() {
  const { isAdmin } = useAuth()
  
  // State management
  const [rooms, setRooms] = useState([])
  const [students, setStudents] = useState([])
  const [allotments, setAllotments] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [occupiedSeats, setOccupiedSeats] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('') // For student search
  const [departmentFilter, setDepartmentFilter] = useState('') // For filtering students by department
  const [step, setStep] = useState(1) // 1: Select seats, 2: Select students
  
  // Search and filter state for allotment list
  const [allotmentSearchTerm, setAllotmentSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    id: null,
    room_id: '',
    seat_number: ''
  })

  // Load initial data
  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  // Load occupied seats when room is selected or allotments change
  useEffect(() => {
    if (selectedRoom) {
      loadOccupiedSeats(selectedRoom.id)
    }
  }, [selectedRoom, allotments])

  async function loadData() {
    try {
      setLoading(true)
      const [roomsData, studentsData, allotmentsData] = await Promise.all([
        uploadAPI.getRooms(),
        uploadAPI.getStudents(),
        allotmentAPI.getAllotments().catch(() => [])
      ])
      setRooms(roomsData)
      setStudents(studentsData)
      setAllotments(allotmentsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      alert('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadOccupiedSeats(roomId) {
    try {
      // Filter allotments for this specific room using the room_id field
      const roomAllotments = allotments.filter(a => a.room_id === roomId)
      const occupied = roomAllotments.map(a => parseInt(a.seat_number))
      console.log('Room ID:', roomId, 'Room Allotments:', roomAllotments, 'Occupied seats:', occupied)
      setOccupiedSeats(occupied)
    } catch (error) {
      console.error('Failed to load occupied seats:', error)
    }
  }

  // Handle seat selection/deselection
  function handleSeatSelect(seatNumber) {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber)
      } else {
        return [...prev, seatNumber]
      }
    })
  }

  // Handle student selection
  function handleStudentSelect(studentId) {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId)
      } else {
        return [...prev, studentId]
      }
    })
  }

  // Get unassigned students - check if student is already assigned to ANY seat
  const unassignedStudents = students.filter(student => {
    // Check if student has any allotment (in any room) using student_id field
    const hasAllotment = allotments.some(a => a.student_id === student.id)
    return !hasAllotment
  })

  // Filter students by search term and department
  const filteredStudents = unassignedStudents.filter(student => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = (
      student.name.toLowerCase().includes(search) ||
      student.roll_no.toLowerCase().includes(search) ||
      student.department.toLowerCase().includes(search)
    )
    const matchesDepartment = !departmentFilter || student.department === departmentFilter
    return matchesSearch && matchesDepartment
  })

  // Get unique departments from unassigned students
  const availableDepartments = [...new Set(unassignedStudents.map(s => s.department))].sort()

  // Select all filtered students (up to the number of available seats)
  const handleSelectAllStudents = () => {
    const availableSeatsCount = selectedSeats.length
    const allFilteredIds = filteredStudents.slice(0, availableSeatsCount).map(s => s.id)
    setSelectedStudents(allFilteredIds)
  }

  // Deselect all students
  const handleDeselectAllStudents = () => {
    setSelectedStudents([])
  }

  // Handle assignment submission
  async function handleAssignment() {
    if (!selectedRoom || selectedSeats.length === 0 || selectedStudents.length === 0) {
      alert('Please select seats and students')
      return
    }

    if (selectedStudents.length > selectedSeats.length) {
      alert(`You have selected ${selectedStudents.length} students but only ${selectedSeats.length} seats. Please select fewer students or more seats.`)
      return
    }

    try {
      setLoading(true)

      // Sort seats and create assignments
      const sortedSeats = [...selectedSeats].sort((a, b) => a - b)
      
      // Only assign students to the first N seats (where N = number of students)
      for (let i = 0; i < selectedStudents.length; i++) {
        await allotmentAPI.createAllotment({
          student_id: selectedStudents[i],
          room_id: selectedRoom.id,
          seat_number: sortedSeats[i]
        })
      }

      const unassignedSeats = selectedSeats.length - selectedStudents.length
      const message = unassignedSeats > 0 
        ? `Successfully assigned ${selectedStudents.length} students to seats! ${unassignedSeats} seat(s) left unassigned.`
        : `Successfully assigned ${selectedStudents.length} students to seats!`
      
      alert(message)
      
      // Reset and reload
      setSelectedSeats([])
      setSelectedStudents([])
      setStep(1)
      await loadData()
      if (selectedRoom) {
        await loadOccupiedSeats(selectedRoom.id)
      }
    } catch (error) {
      console.error('Assignment failed:', error)
      alert(error.message || 'Failed to assign seats')
    } finally {
      setLoading(false)
    }
  }

  // Reset selection
  function resetSelection() {
    setSelectedSeats([])
    setSelectedStudents([])
    setStep(1)
  }

  // Open edit modal
  function openEditModal(allotment) {
    setEditForm({
      id: allotment.id,
      room_id: rooms.find(r => r.room_no === allotment.room_no)?.id || '',
      seat_number: allotment.seat_number
    })
    setEditModalOpen(true)
  }

  // Handle edit submission
  async function handleEditAllotment(e) {
    e.preventDefault()
    
    if (!editForm.room_id || !editForm.seat_number) {
      alert('Please fill all fields')
      return
    }

    try {
      setLoading(true)
      await allotmentAPI.updateAllotment(
        editForm.id,
        editForm.room_id,
        parseInt(editForm.seat_number)
      )
      setEditModalOpen(false)
      await loadData()
      if (selectedRoom) {
        await loadOccupiedSeats(selectedRoom.id)
      }
      alert('Seat allotment updated successfully!')
    } catch (error) {
      console.error('Update failed:', error)
      alert(error.message || 'Failed to update allotment')
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          🎫 Visual Seat Selection
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Select seats visually and assign students - then view all allotments below
        </p>
      </div>

      {/* Room Selection */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Room
        </label>
        <select
          value={selectedRoom?.id || ''}
          onChange={(e) => {
            const room = rooms.find(r => r.id === parseInt(e.target.value))
            setSelectedRoom(room)
            setSelectedSeats([])
            setSelectedStudents([])
            setStep(1)
          }}
          className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">-- Select a Room --</option>
          {rooms.map(room => (
            <option key={room.id} value={room.id}>
              {room.room_no} - Floor {room.floor} - {room.number_of_benches}x{room.seats_per_bench} layout (Capacity: {room.capacity})
            </option>
          ))}
        </select>
      </div>

      {selectedRoom && (
        <>
          {/* Step Indicator */}
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              <span className="font-bold">1</span>
              <span>Select Seats</span>
            </div>
            <div className="text-gray-400">→</div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              <span className="font-bold">2</span>
              <span>Select Students</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Seat Grid */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Room Layout: {selectedRoom.room_no}
              </h2>
              
              <SeatGrid
                room={selectedRoom}
                occupiedSeats={occupiedSeats}
                selectedSeats={selectedSeats}
                onSeatSelect={handleSeatSelect}
                readOnly={step === 2}
              />

              {step === 1 && selectedSeats.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Next: Select Students ({selectedSeats.length} seats)
                </button>
              )}
            </div>

            {/* Right Panel: Student Selection */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                {step === 1 ? 'Selected Seats' : 'Select Students'}
              </h2>

              {step === 1 ? (
                <div>
                  {selectedSeats.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      Click on seats in the grid to select them
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Selected {selectedSeats.length} seat(s):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSeats.sort((a, b) => a - b).map(seat => (
                          <div key={seat} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded font-semibold">
                            Seat {seat}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Search and Filter */}
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="🔍 Search students..."
                      className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                    />
                    
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">All Departments</option>
                      {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllStudents}
                        disabled={filteredStudents.length === 0 || selectedSeats.length === 0}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Select All ({Math.min(filteredStudents.length, selectedSeats.length)}/{filteredStudents.length})
                      </button>
                      <button
                        onClick={handleDeselectAllStudents}
                        disabled={selectedStudents.length === 0}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select up to {selectedSeats.length} student(s) for {selectedSeats.length} seat(s)
                    <br />
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {selectedStudents.length} / {selectedSeats.length} selected
                    </span>
                  </p>

                  {/* Student List */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredStudents.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No unassigned students found
                      </p>
                    ) : (
                      filteredStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentSelect(student.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            selectedStudents.includes(student.id)
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-white">
                                {student.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {student.roll_no} • {student.department}
                              </p>
                            </div>
                            {selectedStudents.includes(student.id) && (
                              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {selectedStudents.indexOf(student.id) + 1}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={resetSelection}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleAssignment}
                      disabled={selectedStudents.length === 0 || selectedStudents.length > selectedSeats.length || loading}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      {loading ? 'Assigning...' : 'Assign Seats'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedRoom && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎫</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Select a room to begin visual seat selection
          </p>
        </div>
      )}

      {/* Allotment List Section */}
      {allotments.length > 0 && (
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              📋 All Seat Allotments
            </h2>

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
                                onClick={() => openEditModal(a)}
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Delete this allotment?')) {
                                    try {
                                      await allotmentAPI.deleteAllotment(a.id)
                                      await loadData()
                                      if (selectedRoom) {
                                        await loadOccupiedSeats(selectedRoom.id)
                                      }
                                      alert('Allotment deleted successfully')
                                    } catch (error) {
                                      alert(error.message || 'Failed to delete')
                                    }
                                  }
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

      {/* Edit Allotment Modal */}
      <Modal open={editModalOpen} title="✏️ Edit Seat Allotment" onClose={() => setEditModalOpen(false)}>
        <form onSubmit={handleEditAllotment} className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>ℹ️ Info:</strong> You can change the room and seat number for this allotment.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Room *</label>
            <select
              value={editForm.room_id}
              onChange={(e) => setEditForm({...editForm, room_id: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">-- Select Room --</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_no} - Floor {room.floor} (Capacity: {room.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seat Number *</label>
            <input
              type="number"
              value={editForm.seat_number}
              onChange={(e) => setEditForm({...editForm, seat_number: e.target.value})}
              className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter seat number"
              min="1"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-600">
            <button 
              type="button" 
              onClick={() => setEditModalOpen(false)} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
            >
              <span>✓</span> {loading ? 'Updating...' : 'Update Allotment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
