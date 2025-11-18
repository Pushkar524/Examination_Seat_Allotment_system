import React, {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { uploadAPI, allotmentAPI } from '../services/api'

export default function Dashboard(){
  const { isAdmin, role, studentId } = useAuth()
  const navigate = useNavigate()
  
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    totalRooms: 0,
    totalCapacity: 0,
    allottedSeats: 0,
    roomsUsed: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      loadStatistics()
    }
  }, [isAdmin])

  async function loadStatistics() {
    try {
      setLoading(true)
      const [students, rooms, stats] = await Promise.all([
        uploadAPI.getStudents(),
        uploadAPI.getRooms(),
        allotmentAPI.getStatistics().catch(() => ({ allotted_students: 0, rooms_used: 0 }))
      ])

      const totalCapacity = rooms.reduce((sum, room) => sum + parseInt(room.capacity || 0), 0)

      setStatistics({
        totalStudents: students.length,
        totalRooms: rooms.length,
        totalCapacity: totalCapacity,
        allottedSeats: parseInt(stats.allotted_students || 0),
        roomsUsed: parseInt(stats.rooms_used || 0)
      })
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Admin Dashboard
  if (isAdmin || role === 'admin') {
    return (
      <div>
        <h2 className="text-3xl font-bold mb-2 text-gray-800">Dashboard</h2>
        <p className="text-gray-600 mb-8">Welcome to Examination Seat Allotment System</p>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading statistics...</div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-100 border border-cyan-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-cyan-600 text-4xl">👥</div>
                  <div className="bg-cyan-200 rounded-full px-3 py-1 text-xs font-semibold text-cyan-800">
                    TOTAL
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{statistics.totalStudents}</div>
                <div className="text-sm text-gray-600 font-medium">Registered Students</div>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-pink-100 border border-rose-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-rose-600 text-4xl">🏢</div>
                  <div className="bg-rose-200 rounded-full px-3 py-1 text-xs font-semibold text-rose-800">
                    AVAILABLE
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{statistics.totalRooms}</div>
                <div className="text-sm text-gray-600 font-medium">Examination Rooms</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-100 border border-purple-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-purple-600 text-4xl">💺</div>
                  <div className="bg-purple-200 rounded-full px-3 py-1 text-xs font-semibold text-purple-800">
                    CAPACITY
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{statistics.totalCapacity}</div>
                <div className="text-sm text-gray-600 font-medium">Total Seat Capacity</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-green-600 text-4xl">✅</div>
                  <div className="bg-green-200 rounded-full px-3 py-1 text-xs font-semibold text-green-800">
                    ALLOTTED
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{statistics.allottedSeats}</div>
                <div className="text-sm text-gray-600 font-medium">Seats Allotted</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/students')}
                  className="bg-white border-2 border-cyan-200 hover:border-cyan-400 rounded-xl p-6 text-left transition-all hover:shadow-lg group"
                >
                  <div className="text-cyan-600 text-3xl mb-3 group-hover:scale-110 transition-transform">📚</div>
                  <div className="font-semibold text-gray-800 mb-1">Manage Students</div>
                  <div className="text-sm text-gray-600">Upload and view student data</div>
                </button>

                <button
                  onClick={() => navigate('/rooms')}
                  className="bg-white border-2 border-rose-200 hover:border-rose-400 rounded-xl p-6 text-left transition-all hover:shadow-lg group"
                >
                  <div className="text-rose-600 text-3xl mb-3 group-hover:scale-110 transition-transform">🏛️</div>
                  <div className="font-semibold text-gray-800 mb-1">Manage Rooms</div>
                  <div className="text-sm text-gray-600">Configure examination rooms</div>
                </button>

                <button
                  onClick={() => navigate('/staff')}
                  className="bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 text-left transition-all hover:shadow-lg group"
                >
                  <div className="text-purple-600 text-3xl mb-3 group-hover:scale-110 transition-transform">👨‍🏫</div>
                  <div className="font-semibold text-gray-800 mb-1">Invigilators</div>
                  <div className="text-sm text-gray-600">Manage invigilator list</div>
                </button>

                <button
                  onClick={() => navigate('/allotment')}
                  className="bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl p-6 text-left transition-all hover:shadow-lg group text-white"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎯</div>
                  <div className="font-semibold mb-1">Seat Allotment</div>
                  <div className="text-sm text-green-50">Allocate seats to students</div>
                </button>
              </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 font-bold">
                      {statistics.totalCapacity > 0 ? Math.round((statistics.allottedSeats / statistics.totalCapacity) * 100) : 0}%
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">Room Capacity Utilization</div>
                      <div className="text-sm text-gray-500">{statistics.allottedSeats} of {statistics.totalCapacity} seats utilized</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statistics.allottedSeats === 0
                      ? 'bg-gray-100 text-gray-700'
                      : statistics.allottedSeats <= statistics.totalCapacity 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {statistics.allottedSeats === 0 ? 'Not Started' : statistics.allottedSeats <= statistics.totalCapacity ? 'Within Capacity' : 'Exceeded'}
                  </div>
                </div>

                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                      {statistics.allottedSeats > 0 ? Math.round((statistics.allottedSeats / statistics.totalStudents) * 100) : 0}%
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">Seat Allotment Progress</div>
                      <div className="text-sm text-gray-500">{statistics.allottedSeats} of {statistics.totalStudents} students allotted</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statistics.allottedSeats === statistics.totalStudents
                      ? 'bg-green-100 text-green-700'
                      : statistics.allottedSeats > 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {statistics.allottedSeats === statistics.totalStudents ? 'Complete' : statistics.allottedSeats > 0 ? 'In Progress' : 'Pending'}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-bold">
                      {statistics.roomsUsed}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">Rooms in Use</div>
                      <div className="text-sm text-gray-500">{statistics.roomsUsed} of {statistics.totalRooms} rooms utilized</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    Active
                  </div>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            {statistics.totalStudents === 0 && (
              <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-start">
                  <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                  <div>
                    <div className="font-semibold text-gray-800 mb-1">Getting Started</div>
                    <div className="text-sm text-gray-700">
                      Start by uploading student data and configuring examination rooms. Once data is ready, proceed to seat allotment.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Student Dashboard (simplified for now)
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Student Dashboard</h2>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📋</div>
        <div className="text-xl font-semibold text-gray-800 mb-2">Welcome, Student!</div>
        <div className="text-gray-600">Your exam seat allotment information will appear here once assigned.</div>
      </div>
    </div>
  )
}
