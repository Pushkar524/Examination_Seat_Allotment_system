import React, {useState, useEffect, useRef} from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { uploadAPI } from '../services/api'

export default function Rooms(){
  const { isAdmin } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadErrors, setUploadErrors] = useState([])
  const fileInputRef = useRef(null)
  
  // Manual add state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [roomForm, setRoomForm] = useState({
    room_no: '',
    capacity: '',
    floor: ''
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (isAdmin) {
      loadRooms()
    }
  }, [isAdmin])

  async function loadRooms() {
    try {
      setLoading(true)
      const data = await uploadAPI.getRooms()
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  function openUploadModal(){ 
    setUploadModalOpen(true)
    setUploadErrors([])
    setUploadSuccess('')
    if(fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploadErrors([])
    setUploadSuccess('')
    setLoading(true)

    try {
      const result = await uploadAPI.uploadRooms(file)
      setUploadSuccess(`✓ Successfully imported ${result.successCount} room(s)`)
      
      if (result.errors && result.errors.length > 0) {
        setUploadErrors(result.errors.map(err => `${err.room_no}: ${err.error}`))
      }

      // Reload rooms list
      await loadRooms()

      // Close modal after 2 seconds if fully successful
      if (!result.errorCount || result.errorCount === 0) {
        setTimeout(() => {
          setUploadModalOpen(false)
          setUploadSuccess('')
        }, 2000)
      }
    } catch (error) {
      setUploadErrors([error.message || 'Upload failed'])
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setAddModalOpen(true)
    setRoomForm({
      room_no: '',
      capacity: '',
      floor: ''
    })
    setFormError('')
  }

  async function handleManualAdd(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      await uploadAPI.addRoom(roomForm)
      await loadRooms()
      setAddModalOpen(false)
      alert('Room added successfully!')
    } catch (error) {
      setFormError(error.message || 'Failed to add room')
    } finally {
      setLoading(false)
    }
  }

  // Calculate total capacity
  const totalCapacity = rooms.reduce((sum, room) => sum + parseInt(room.capacity || 0), 0)

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">ROOM MANAGEMENT</h2>

      <div className="bg-white border p-4 mb-6 shadow rounded">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-medium">Examination Rooms ({rooms.length})</h3>
            <p className="text-sm text-gray-600">Total Capacity: {totalCapacity} seats</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={openAddModal} 
                className="bg-blue-400 hover:bg-blue-500 px-4 py-2 rounded transition duration-200 flex items-center gap-2"
              >
                ➕ Add Manually
              </button>
              <button 
                onClick={openUploadModal} 
                className="bg-green-400 hover:bg-green-500 px-4 py-2 rounded transition duration-200 flex items-center gap-2"
              >
                📁 Import Excel/CSV
              </button>
            </div>
          )}
        </div>

        {loading && <div className="text-center py-4">Loading...</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3">ROOM NO</th>
                <th className="border p-3">FLOOR</th>
                <th className="border p-3">CAPACITY</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r=> (
                <tr key={r.id} className="h-14 hover:bg-gray-50">
                  <td className="border p-2 font-medium">{r.room_no}</td>
                  <td className="border p-2">{r.floor}</td>
                  <td className="border p-2">{r.capacity}</td>
                </tr>
              ))}
              {rooms.length===0 && !loading && (
                <tr className="h-12"><td className="p-4 text-center text-gray-500" colSpan={3}>No rooms yet. Upload a file to add rooms.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal open={uploadModalOpen} title="Import Rooms from Excel/CSV" onClose={()=>setUploadModalOpen(false)}>
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📋 File Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-2">Your Excel/CSV file must contain the following columns:</p>
            <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono">
              room_no, capacity, floor
            </div>
            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>• <strong>room_no</strong>: Room number (e.g., R101, A-203)</p>
              <p>• <strong>capacity</strong>: Number of seats (e.g., 30)</p>
              <p>• <strong>floor</strong>: Floor number or name (e.g., 1, Ground)</p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-gray-50 p-3 rounded border">
            <h5 className="text-sm font-semibold mb-2">Example content:</h5>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`room_no,capacity,floor
R101,30,1
R102,25,1
R201,30,2`}
            </pre>
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel or CSV File
            </label>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Accepted formats: .csv, .xlsx, .xls</p>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-800 font-medium">{uploadSuccess}</p>
            </div>
          )}

          {/* Error Messages */}
          {uploadErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-red-900 mb-2">⚠️ Upload Issues</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {uploadErrors.map((err, idx) => (
                  <li key={idx} className="font-mono text-xs">• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Manual Add Modal */}
      <Modal open={addModalOpen} title="Add Room Manually" onClose={()=>setAddModalOpen(false)}>
        <form onSubmit={handleManualAdd} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
            <input
              type="text"
              value={roomForm.room_no}
              onChange={(e) => setRoomForm({...roomForm, room_no: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., R101, A-203"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
            <input
              type="number"
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})}
              className="input w-full"
              required
              min="1"
              placeholder="e.g., 30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
            <input
              type="text"
              value={roomForm.floor}
              onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})}
              className="input w-full"
              placeholder="e.g., 1, Ground, First Floor"
            />
          </div>

          {formError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <p className="text-red-800 text-sm">{formError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
