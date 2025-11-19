import React, {useState, useEffect} from 'react'
import { useAuth } from '../context/AuthContext'
import { uploadAPI } from '../services/api'

export default function InvigilatorAssignment(){
  const { isAdmin } = useAuth()
  const [invigilators, setInvigilators] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  async function loadData() {
    try {
      setLoading(true)
      const [invigilatorsData, roomsData] = await Promise.all([
        uploadAPI.getInvigilators(),
        uploadAPI.getRooms()
      ])
      setInvigilators(invigilatorsData)
      setRooms(roomsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      alert(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignment(invigilatorId, roomId) {
    try {
      setLoading(true)
      await uploadAPI.assignInvigilator(invigilatorId, roomId === '' ? null : roomId)
      await loadData()
      alert(roomId === '' ? 'Invigilator unassigned successfully!' : 'Invigilator assigned successfully!')
    } catch (error) {
      console.error('Assignment failed:', error)
      alert(error.message || 'Failed to assign invigilator')
    } finally {
      setLoading(false)
    }
  }

  const filteredInvigilators = invigilators.filter(inv => 
    inv.name.toLowerCase().includes(filter.toLowerCase()) ||
    inv.invigilator_id.toLowerCase().includes(filter.toLowerCase()) ||
    (inv.room_no && inv.room_no.toLowerCase().includes(filter.toLowerCase()))
  )

  const assignedCount = invigilators.filter(inv => inv.room_id).length
  const unassignedCount = invigilators.length - assignedCount

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
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">👨‍🏫 Invigilator Assignment</h1>
        <p className="text-gray-600 dark:text-gray-300">Assign invigilators to examination rooms</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white p-4 rounded-lg shadow-lg">
          <div className="text-3xl font-bold">{invigilators.length}</div>
          <div className="text-sm opacity-90">Total Invigilators</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white p-4 rounded-lg shadow-lg">
          <div className="text-3xl font-bold">{assignedCount}</div>
          <div className="text-sm opacity-90">Assigned</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white p-4 rounded-lg shadow-lg">
          <div className="text-3xl font-bold">{unassignedCount}</div>
          <div className="text-sm opacity-90">Unassigned</div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 Search by name, ID, or room..."
          className="w-full border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Invigilators Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
              <th className="border p-3 text-left font-semibold">Invigilator ID</th>
              <th className="border p-3 text-left font-semibold">Name</th>
              <th className="border p-3 text-left font-semibold">Current Assignment</th>
              <th className="border p-3 text-left font-semibold">Assign to Room</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="h-32">
                <td className="border p-4 text-center text-gray-500" colSpan={4}>
                  <div className="text-lg">Loading invigilators...</div>
                </td>
              </tr>
            ) : filteredInvigilators.length === 0 ? (
              <tr className="h-32">
                <td className="border p-4 text-center text-gray-500" colSpan={4}>
                  {invigilators.length === 0 ? (
                    <div>
                      <div className="text-5xl mb-3">👨‍🏫</div>
                      <div className="text-lg font-medium">No invigilators found</div>
                      <div className="text-sm mt-1">Upload or add invigilators first</div>
                    </div>
                  ) : (
                    'No matching invigilators found'
                  )}
                </td>
              </tr>
            ) : (
              filteredInvigilators.map(inv => (
                <tr key={inv.id} className="h-12 hover:bg-blue-50 transition-colors">
                  <td className="border p-2 font-mono">{inv.invigilator_id}</td>
                  <td className="border p-2 font-medium">{inv.name}</td>
                  <td className="border p-2">
                    {inv.room_id ? (
                      <span className="bg-green-100 px-3 py-1 rounded text-green-800 font-semibold">
                        {inv.room_no} (Floor {inv.floor})
                      </span>
                    ) : (
                      <span className="bg-gray-100 px-3 py-1 rounded text-gray-600">
                        Not Assigned
                      </span>
                    )}
                  </td>
                  <td className="border p-2">
                    <select
                      value={inv.room_id || ''}
                      onChange={(e) => handleAssignment(inv.id, e.target.value)}
                      disabled={loading}
                      className="w-full border-2 border-blue-400 rounded-lg px-3 py-1 focus:border-blue-600 focus:outline-none disabled:bg-gray-100"
                    >
                      <option value="">-- Select Room --</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.room_no} (Floor {room.floor}, Capacity: {room.capacity})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Help Text */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Select a room from the dropdown to assign an invigilator. 
          Select "-- Select Room --" to unassign an invigilator from their current room.
        </p>
      </div>
    </div>
  )
}
