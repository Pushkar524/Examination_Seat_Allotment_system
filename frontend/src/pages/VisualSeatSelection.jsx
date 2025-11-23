import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import SeatGrid from '../components/SeatGrid'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [step, setStep] = useState(1) // 1: Select seats, 2: Select students

  // Load initial data
  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  // Load occupied seats when room is selected
  useEffect(() => {
    if (selectedRoom) {
      loadOccupiedSeats(selectedRoom.id)
    }
  }, [selectedRoom])

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
      const roomAllotments = allotments.filter(a => a.room_id === roomId)
      const occupied = roomAllotments.map(a => a.seat_number)
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
        // Limit to number of selected seats
        if (prev.length < selectedSeats.length) {
          return [...prev, studentId]
        }
        return prev
      }
    })
  }

  // Get unassigned students
  const unassignedStudents = students.filter(student => {
    const hasAllotment = allotments.some(a => a.student_id === student.id)
    return !hasAllotment
  })

  // Filter students by search term
  const filteredStudents = unassignedStudents.filter(student => {
    const search = searchTerm.toLowerCase()
    return (
      student.name.toLowerCase().includes(search) ||
      student.roll_no.toLowerCase().includes(search) ||
      student.department.toLowerCase().includes(search)
    )
  })

  // Handle assignment submission
  async function handleAssignment() {
    if (!selectedRoom || selectedSeats.length === 0 || selectedStudents.length === 0) {
      alert('Please select seats and students')
      return
    }

    if (selectedSeats.length !== selectedStudents.length) {
      alert(`Please select exactly ${selectedSeats.length} students for ${selectedSeats.length} seats`)
      return
    }

    try {
      setLoading(true)

      // Sort seats and create assignments
      const sortedSeats = [...selectedSeats].sort((a, b) => a - b)
      
      for (let i = 0; i < sortedSeats.length; i++) {
        await allotmentAPI.createAllotment({
          student_id: selectedStudents[i],
          room_id: selectedRoom.id,
          seat_number: sortedSeats[i]
        })
      }

      alert(`Successfully assigned ${selectedSeats.length} students to seats!`)
      
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
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          🎫 Visual Seat Selection
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Select seats visually and assign students (like booking bus tickets)
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
                  {/* Search */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Search students..."
                    className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 mb-4 focus:border-blue-500 focus:outline-none"
                  />

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select {selectedSeats.length} student(s) for {selectedSeats.length} seat(s)
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
                          disabled={!selectedStudents.includes(student.id) && selectedStudents.length >= selectedSeats.length}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedStudents.includes(student.id)
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                          } ${
                            !selectedStudents.includes(student.id) && selectedStudents.length >= selectedSeats.length
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer'
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
                      disabled={selectedStudents.length !== selectedSeats.length || loading}
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
    </div>
  )
}
