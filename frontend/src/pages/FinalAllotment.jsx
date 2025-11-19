import React, {useState, useEffect} from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { uploadAPI, allotmentAPI, exportAPI } from '../services/api'

export default function FinalAllotment(){
  const { isAdmin } = useAuth()
  
  // State for data from backend
  const [students, setStudents] = useState([])
  const [rooms, setRooms] = useState([])
  const [allotments, setAllotments] = useState([])
  const [statistics, setStatistics] = useState({
    allotted_students: 0,
    rooms_used: 0,
    total_students: 0,
    total_rooms: 0,
    total_capacity: 0
  })
  const [loading, setLoading] = useState(false)

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  // Modal state
  const [autoAllotModalOpen, setAutoAllotModalOpen] = useState(false)
  const [manualAllotModalOpen, setManualAllotModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRoomIds, setSelectedRoomIds] = useState([])
  const [deleteId, setDeleteId] = useState(null)
  
  // Manual allotment form
  const [manualForm, setManualForm] = useState({
    student_id: '',
    room_id: '',
    seat_number: ''
  })
  
  // Edit form
  const [editForm, setEditForm] = useState({
    id: null,
    room_id: '',
    seat_number: ''
  })

  // Load data from backend on mount
  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      setLoading(true)
      const [studentsData, roomsData, allotmentsData, statsData] = await Promise.all([
        uploadAPI.getStudents(),
        uploadAPI.getRooms(),
        allotmentAPI.getAllotments().catch(() => []),
        allotmentAPI.getStatistics().catch(() => ({
          allotted_students: 0,
          rooms_used: 0,
          total_students: 0,
          total_rooms: 0,
          total_capacity: 0
        }))
      ])
      
      // Calculate total capacity from rooms
      const totalCapacity = roomsData.reduce((sum, room) => sum + parseInt(room.capacity || 0), 0)
      
      setStudents(studentsData)
      setRooms(roomsData)
      setAllotments(allotmentsData)
      setStatistics({
        ...statsData,
        total_students: studentsData.length, // Use actual student count
        total_rooms: roomsData.length,       // Use actual room count
        total_capacity: totalCapacity         // Use calculated capacity
      })
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  function confirmDelete(id){ setDeleteId(id) }

  async function doDelete(){
    if(deleteId){
      try {
        await allotmentAPI.deleteAllotment(deleteId)
        setDeleteId(null)
        await loadAllData()
        alert('Seat allotment deleted successfully')
      } catch (error) {
        console.error('Delete failed:', error)
        alert(error.message || 'Failed to delete allotment')
      }
    }
  }

  // Export handlers
  async function handleExportExcel() {
    try {
      setLoading(true)
      await exportAPI.exportExcel()
    } catch (error) {
      console.error('Export Excel failed:', error)
      alert(error.message || 'Failed to export Excel')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPDF() {
    try {
      setLoading(true)
      await exportAPI.exportPDF()
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert(error.message || 'Failed to export PDF')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportRoomPDF(roomId) {
    if (!roomId) return
    try {
      setLoading(true)
      await exportAPI.exportRoomPDF(roomId)
    } catch (error) {
      console.error('Export room PDF failed:', error)
      alert(error.message || 'Failed to export room PDF')
    } finally {
      setLoading(false)
    }
  }

  // Automatic Allotment Logic
  async function performAutomaticAllotment(){
    if(students.length === 0){
      alert('No students found. Please upload students first.')
      return
    }

    // Filter rooms based on selection
    const roomsToUse = selectedRoomIds.length > 0 
      ? rooms.filter(r => selectedRoomIds.includes(r.id))
      : rooms

    if(roomsToUse.length === 0){
      alert('No rooms selected. Please select at least one room.')
      return
    }

    const totalCapacity = roomsToUse.reduce((sum, room) => sum + parseInt(room.capacity || 0), 0)
    
    if(students.length > totalCapacity){
      alert(`Insufficient room capacity! Students: ${students.length}, Selected Rooms Capacity: ${totalCapacity}`)
      return
    }

    const confirmMsg = selectedRoomIds.length > 0
      ? `Allocate seats for ${students.length} students in ${roomsToUse.length} selected room(s)?`
      : `Allocate seats for ${students.length} students across all ${rooms.length} rooms?`
    
    if(!window.confirm(confirmMsg)){
      return
    }

    try {
      setLoading(true)
      const result = await allotmentAPI.generateAllotment(selectedRoomIds)
      setAutoAllotModalOpen(false)
      setSelectedRoomIds([])
      await loadAllData()
      alert(`Success! Allocated ${result.allottedSeats} students across ${result.roomsUsed} rooms.`)
    } catch (error) {
      console.error('Allotment failed:', error)
      alert(error.message || 'Failed to generate seat allotment')
    } finally {
      setLoading(false)
    }
  }

  function openAutoAllot(){
    setAutoAllotModalOpen(true)
    setSelectedRoomIds([])
  }

  function openManualAllot(){
    setManualAllotModalOpen(true)
    setManualForm({
      student_id: '',
      room_id: '',
      seat_number: ''
    })
  }

  async function handleManualAllot(e){
    e.preventDefault()
    
    if(!manualForm.student_id || !manualForm.room_id || !manualForm.seat_number){
      alert('Please fill all fields')
      return
    }

    try {
      setLoading(true)
      await allotmentAPI.createAllotment(
        manualForm.student_id,
        manualForm.room_id,
        parseInt(manualForm.seat_number)
      )
      setManualAllotModalOpen(false)
      await loadAllData()
      alert('Seat allotted successfully!')
    } catch (error) {
      console.error('Manual allotment failed:', error)
      alert(error.message || 'Failed to allot seat')
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(allotment){
    setEditForm({
      id: allotment.id,
      room_id: rooms.find(r => r.room_no === allotment.room_no)?.id || '',
      seat_number: allotment.seat_number
    })
    setEditModalOpen(true)
  }

  async function handleEditAllotment(e){
    e.preventDefault()
    
    if(!editForm.room_id || !editForm.seat_number){
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
      await loadAllData()
      alert('Seat allotment updated successfully!')
    } catch (error) {
      console.error('Update failed:', error)
      alert(error.message || 'Failed to update allotment')
    } finally {
      setLoading(false)
    }
  }

  function toggleRoomSelection(roomId){
    setSelectedRoomIds(prev => 
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    )
  }

  // Filter allotments based on search and filters
  const filteredAllotments = allotments.filter(a => {
    const matchesSearch = !searchTerm || 
      a.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCourse = !courseFilter || a.department?.includes(courseFilter)
    const matchesRoom = !roomFilter || a.room_no?.includes(roomFilter)
    
    return matchesSearch && matchesCourse && matchesRoom
  })

  // Get unique values for filter dropdowns
  const uniqueCourses = [...new Set(allotments.map(a => a.department).filter(c => c))]
  const uniqueRooms = [...new Set(allotments.map(a => a.room_no).filter(r => r))]
  
  // Create room mapping for export (room_no -> room_id)
  const roomMapping = {}
  rooms.forEach(room => {
    roomMapping[room.room_no] = room.id
  })

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">FINAL SEAT ALLOTMENT</h2>
      
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="card bg-gradient-to-br from-cyan-50 to-blue-100">
          <div className="text-sm text-gray-600 mb-2 font-medium">TOTAL STUDENTS</div>
          <div className="text-3xl font-bold text-gray-800">{statistics.total_students || 0}</div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="text-sm text-gray-600 mb-2 font-medium">STUDENTS ALLOTTED</div>
          <div className="text-3xl font-bold text-green-600">{statistics.allotted_students || 0}</div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-indigo-100">
          <div className="text-sm text-gray-600 mb-2 font-medium">ROOMS USED</div>
          <div className="text-3xl font-bold text-purple-600">{statistics.rooms_used || 0}</div>
        </div>

        <div className="card bg-gradient-to-br from-rose-50 to-pink-100">
          <div className="text-sm text-gray-600 mb-2 font-medium">TOTAL CAPACITY</div>
          <div className="text-3xl font-bold text-rose-600">{statistics.total_capacity || 0}</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 mb-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-3 gap-4 mb-3">
          <input 
            value={searchTerm} 
            onChange={e=>setSearchTerm(e.target.value)} 
            placeholder="Search By Student Name Or Roll No" 
            className="input" 
          />
          <select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)} className="input">
            <option value="">All Departments</option>
            {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={roomFilter} onChange={e=>setRoomFilter(e.target.value)} className="input">
            <option value="">All Rooms</option>
            {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        
        {isAdmin && (
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                onClick={handleExportExcel}
                disabled={allotments.length === 0 || loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg shadow transition duration-200 flex items-center gap-2"
                title="Export all allotments to Excel"
              >
                <span>📊</span> Export Excel
              </button>
              <button 
                onClick={handleExportPDF}
                disabled={allotments.length === 0 || loading}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg shadow transition duration-200 flex items-center gap-2"
                title="Export all allotments to PDF"
              >
                <span>📄</span> Export PDF
              </button>
              <div className="flex gap-2 items-center">
                <select 
                  onChange={(e) => e.target.value && handleExportRoomPDF(roomMapping[e.target.value])}
                  value=""
                  disabled={uniqueRooms.length === 0 || loading}
                  className="border-2 border-purple-500 rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:border-gray-300"
                  title="Export room-wise allotment to PDF"
                >
                  <option value="">🏢 Export by Room</option>
                  {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={openManualAllot}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
              >
                <span>➕</span> Manual Allot
              </button>
              <button 
                onClick={openAutoAllot}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
              >
                <span>⚡</span> {loading ? 'Processing...' : 'Generate Allotments'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
              <th className="border p-3 text-left font-semibold">Roll No</th>
              <th className="border p-3 text-left font-semibold">Student Name</th>
              <th className="border p-3 text-left font-semibold">Department</th>
              <th className="border p-3 text-left font-semibold">Room No</th>
              <th className="border p-3 text-left font-semibold">Floor</th>
              <th className="border p-3 text-left font-semibold">Seat No</th>
              {isAdmin && <th className="border p-3 text-center font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="h-32">
                <td className="border p-4 text-center text-gray-500" colSpan={isAdmin ? 7 : 6}>
                  <div className="text-lg">Loading allotments...</div>
                </td>
              </tr>
            ) : filteredAllotments.length === 0 ? (
              <tr className="h-32">
                <td className="border p-4 text-center text-gray-500" colSpan={isAdmin ? 7 : 6}>
                  {allotments.length === 0 ? (
                    <div>
                      <div className="text-5xl mb-3">📋</div>
                      <div className="text-lg font-medium">No seat allotments yet</div>
                      <div className="text-sm mt-1">Click "Generate Allotments" to automatically allocate seats</div>
                    </div>
                  ) : (
                    'No matching allotments found'
                  )}
                </td>
              </tr>
            ) : (
              filteredAllotments.map(a => (
                <tr key={a.id} className="h-12 hover:bg-blue-50 transition-colors">
                  <td className="border p-2 font-mono">{a.roll_no}</td>
                  <td className="border p-2 font-medium">{a.student_name}</td>
                  <td className="border p-2">{a.department}</td>
                  <td className="border p-2">
                    <span className="bg-cyan-100 px-2 py-1 rounded text-cyan-800 font-semibold">
                      {a.room_no}
                    </span>
                  </td>
                  <td className="border p-2">{a.floor}</td>
                  <td className="border p-2">
                    <span className="bg-purple-100 px-2 py-1 rounded text-purple-800 font-semibold">
                      {a.seat_number}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="border p-2">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={()=>openEditModal(a)} 
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={()=>confirmDelete(a.id)} 
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

      {/* Automatic Allotment Confirmation Modal */}
      <Modal open={autoAllotModalOpen} title="⚡ Automatic Seat Allotment" onClose={()=>setAutoAllotModalOpen(false)}>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-teal-50 p-5 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center text-lg">
              <span className="mr-2">ℹ️</span> How Automatic Allotment Works
            </h4>
            <ul className="text-sm text-green-800 space-y-2 list-disc list-inside">
              <li>All registered students will be allocated seats automatically</li>
              <li>Seats are assigned sorted by Roll Number (ascending order)</li>
              <li>Students are distributed across ALL available rooms based on room capacity</li>
              <li>Seat numbers start from 1 in each room</li>
              <li>Existing allotments will be cleared before generating new ones</li>
            </ul>
          </div>

          {/* Rooms List with Selection */}
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🏢</span> Select Rooms ({selectedRoomIds.length > 0 ? `${selectedRoomIds.length} selected` : 'All rooms'})
              </h4>
              <button
                type="button"
                onClick={() => setSelectedRoomIds([])}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear Selection
              </button>
            </div>
            {rooms.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>No rooms available. Please add rooms first.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {rooms.map((room, index) => (
                  <div 
                    key={room.id} 
                    onClick={() => toggleRoomSelection(room.id)}
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${ 
                      selectedRoomIds.includes(room.id) 
                        ? 'bg-blue-100 border-blue-400' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={() => {}}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{room.room_no}</div>
                        <div className="text-xs text-gray-600">Floor: {room.floor || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="bg-green-100 px-3 py-1 rounded-full">
                      <span className="text-green-800 font-semibold text-sm">Capacity: {room.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded">
              💡 <strong>Tip:</strong> Select specific rooms to allocate seats only in those rooms, or leave unselected to use all rooms.
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{students.length}</div>
                <div className="text-sm text-gray-600 mt-1">Total Students</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {selectedRoomIds.length > 0 ? selectedRoomIds.length : rooms.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedRoomIds.length > 0 ? 'Selected Rooms' : 'Available Rooms'}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {selectedRoomIds.length > 0 
                    ? rooms.filter(r => selectedRoomIds.includes(r.id)).reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)
                    : rooms.reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)
                  }
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Capacity</div>
              </div>
              <div>
                <div className={`text-3xl font-bold ${
                  students.length <= (selectedRoomIds.length > 0 
                    ? rooms.filter(r => selectedRoomIds.includes(r.id)).reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)
                    : rooms.reduce((sum, r) => sum + parseInt(r.capacity || 0), 0))
                    ? 'text-green-600'
                    : 'text-rose-600'
                }`}>
                  {students.length <= (selectedRoomIds.length > 0 
                    ? rooms.filter(r => selectedRoomIds.includes(r.id)).reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)
                    : rooms.reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)) ? 'Sufficient' : 'Exceeded'}
                </div>
                <div className="text-sm text-gray-600 mt-1">Capacity Status</div>
              </div>
            </div>
          </div>

          {students.length > (selectedRoomIds.length > 0 
            ? rooms.filter(r => selectedRoomIds.includes(r.id)).reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)
            : rooms.reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center text-red-800">
                <span className="text-xl mr-2">⚠️</span>
                <div>
                  <div className="font-semibold">Insufficient Capacity!</div>
                  <div className="text-sm">
                    {selectedRoomIds.length > 0 
                      ? 'Selected rooms do not have enough capacity. Please select more rooms.'
                      : 'Please add more rooms or reduce student count before allotment.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              type="button" 
              onClick={()=>setAutoAllotModalOpen(false)} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button 
              onClick={performAutomaticAllotment}
              disabled={loading || students.length > rooms.reduce((sum, r) => sum + parseInt(r.capacity || 0), 0)}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
            >
              <span>⚡</span> {loading ? 'Processing...' : 'Generate Allotments'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div>Are you sure you want to delete this seat allotment?</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={()=>setDeleteId(null)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
          <button onClick={doDelete} className="px-3 py-1 bg-rose-300 rounded">Delete</button>
        </div>
      </Modal>

      {/* Manual Allotment Modal */}
      <Modal open={manualAllotModalOpen} title="➕ Manual Seat Allotment" onClose={()=>setManualAllotModalOpen(false)}>
        <form onSubmit={handleManualAllot} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Student *</label>
            <select
              value={manualForm.student_id}
              onChange={(e) => setManualForm({...manualForm, student_id: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">-- Select Student --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.roll_no} - {student.name} ({student.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Room *</label>
            <select
              value={manualForm.room_id}
              onChange={(e) => setManualForm({...manualForm, room_id: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Seat Number *</label>
            <input
              type="number"
              value={manualForm.seat_number}
              onChange={(e) => setManualForm({...manualForm, seat_number: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter seat number"
              min="1"
              required
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Note:</strong> Make sure the seat number is within the room's capacity and not already occupied.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setManualAllotModalOpen(false)} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition duration-200 flex items-center gap-2 font-semibold"
            >
              <span>✓</span> {loading ? 'Allotting...' : 'Allot Seat'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Allotment Modal */}
      <Modal open={editModalOpen} title="✏️ Edit Seat Allotment" onClose={()=>setEditModalOpen(false)}>
        <form onSubmit={handleEditAllotment} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Info:</strong> You can change the room and seat number for this allotment.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Room *</label>
            <select
              value={editForm.room_id}
              onChange={(e) => setEditForm({...editForm, room_id: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Seat Number *</label>
            <input
              type="number"
              value={editForm.seat_number}
              onChange={(e) => setEditForm({...editForm, seat_number: e.target.value})}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter seat number"
              min="1"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setEditModalOpen(false)} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition duration-200"
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
