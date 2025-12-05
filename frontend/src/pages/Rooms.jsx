import React, {useState, useEffect, useRef} from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { uploadAPI } from '../services/api'

export default function Rooms(){
  const { isAdmin } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadErrors, setUploadErrors] = useState([])
  const fileInputRef = useRef(null)
  
  // Toast and Confirm Dialog state
  const [toast, setToast] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  })

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const closeToast = () => {
    setToast(null)
  }

  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    })
  }

  const closeConfirm = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false })
  }

  const handleConfirm = () => {
    const callback = confirmDialog.onConfirm
    closeConfirm()
    if (callback) {
      callback()
    }
  }
  
  // Manual add state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [roomForm, setRoomForm] = useState({
    id: null,
    room_no: '',
    capacity: '',
    floor: '',
    number_of_benches: '',
    seats_per_bench: ''
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
      id: null,
      room_no: '',
      capacity: '',
      floor: '',
      number_of_benches: '',
      seats_per_bench: ''
    })
    setFormError('')
  }

  function openEditModal(room) {
    setEditModalOpen(true)
    setRoomForm({
      id: room.id,
      room_no: room.room_no,
      capacity: room.capacity,
      floor: room.floor,
      number_of_benches: room.number_of_benches || '',
      seats_per_bench: room.seats_per_bench || ''
    })
    setFormError('')
  }

  async function handleManualAdd(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      // Ensure integers are sent for bench configuration
      const formData = {
        ...roomForm,
        capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
        number_of_benches: roomForm.number_of_benches ? parseInt(roomForm.number_of_benches) : null,
        seats_per_bench: roomForm.seats_per_bench ? parseInt(roomForm.seats_per_bench) : null
      }
      await uploadAPI.addRoom(formData)
      await loadRooms()
      setAddModalOpen(false)
      showToast('Room added successfully!', 'success')
    } catch (error) {
      setFormError(error.message || 'Failed to add room')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      const { id, ...data } = roomForm
      // Ensure integers are sent for bench configuration
      const formData = {
        ...data,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        number_of_benches: data.number_of_benches ? parseInt(data.number_of_benches) : null,
        seats_per_bench: data.seats_per_bench ? parseInt(data.seats_per_bench) : null
      }
      await uploadAPI.updateRoom(roomForm.id, formData)
      await loadRooms()
      setEditModalOpen(false)
      showToast('Room updated successfully!', 'success')
    } catch (error) {
      setFormError(error.message || 'Failed to update room')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    
    try {
      setLoading(true)
      await uploadAPI.deleteRoom(deleteId)
      await loadRooms()
      setDeleteId(null)
      showToast('Room deleted successfully!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to delete room', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAllRooms() {
    if (rooms.length === 0) {
      showToast('No rooms to delete', 'info')
      return
    }

    showConfirm(
      'Delete All Rooms',
      `Are you sure you want to delete ALL ${rooms.length} rooms? This action cannot be undone!`,
      () => {
        showConfirm(
          'Final Confirmation',
          'This will permanently delete all rooms. Are you absolutely sure?',
          async () => {
            try {
              setLoading(true)
              const result = await uploadAPI.deleteAllRooms()
              await loadRooms()
              showToast(result.message || 'All rooms deleted successfully!', 'success')
            } catch (error) {
              showToast(error.message || 'Failed to delete all rooms', 'error')
            } finally {
              setLoading(false)
            }
          },
          'danger'
        )
      },
      'danger'
    )
  }

  // Calculate total capacity
  const totalCapacity = rooms.reduce((sum, room) => sum + parseInt(room.capacity || 0), 0)

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 dark:text-white">ROOM MANAGEMENT</h2>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 p-4 mb-6 shadow rounded">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-medium dark:text-white">Examination Rooms ({rooms.length})</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Capacity: {totalCapacity} seats</p>
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
              <button 
                onClick={handleDeleteAllRooms}
                disabled={loading || rooms.length === 0}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed px-4 py-2 rounded transition duration-200 flex items-center gap-2 text-white font-semibold"
              >
                <span>🗑️</span>
                {loading ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          )}
        </div>

        {loading && <div className="text-center py-4">Loading...</div>}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border dark:border-gray-600 p-3 text-left dark:text-white">ROOM NO</th>
                <th className="border dark:border-gray-600 p-3 text-left dark:text-white">FLOOR</th>
                <th className="border dark:border-gray-600 p-3 text-left dark:text-white">CAPACITY</th>
                <th className="border dark:border-gray-600 p-3 text-left dark:text-white">BENCHES</th>
                <th className="border dark:border-gray-600 p-3 text-left dark:text-white">SEATS</th>
                {isAdmin && (
                  <th className="border dark:border-gray-600 p-3 text-left dark:text-white">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rooms.map(r=> (
                <tr key={r.id} className="h-14 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="border dark:border-gray-600 p-2 font-medium dark:text-gray-200">{r.room_no}</td>
                  <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{r.floor}</td>
                  <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{r.capacity}</td>
                  <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{r.number_of_benches || '-'}</td>
                  <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{r.seats_per_bench || '-'}</td>
                  {isAdmin && (
                    <td className="border dark:border-gray-600 p-2">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => openEditModal(r)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteId(r.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rooms.length===0 && !loading && (
                <tr className="h-12"><td className="p-4 text-center text-gray-500 dark:text-gray-400" colSpan={isAdmin ? 6 : 5}>No rooms yet. Upload a file to add rooms.</td></tr>
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

          <div className="col-span-2 border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">🎫 Seating Layout (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Benches (Rows)</label>
                <input
                  type="number"
                  value={roomForm.number_of_benches}
                  onChange={(e) => {
                    const benches = parseInt(e.target.value) || ''
                    const seats = parseInt(roomForm.seats_per_bench) || 0
                    setRoomForm({
                      ...roomForm, 
                      number_of_benches: e.target.value,
                      capacity: benches && seats ? benches * seats : roomForm.capacity
                    })
                  }}
                  className="input w-full"
                  min="0"
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seats per Bench</label>
                <input
                  type="number"
                  value={roomForm.seats_per_bench}
                  onChange={(e) => {
                    const seats = parseInt(e.target.value) || ''
                    const benches = parseInt(roomForm.number_of_benches) || 0
                    setRoomForm({
                      ...roomForm, 
                      seats_per_bench: e.target.value,
                      capacity: benches && seats ? benches * seats : roomForm.capacity
                    })
                  }}
                  className="input w-full"
                  min="0"
                  placeholder="e.g., 6"
                />
              </div>
            </div>
            {roomForm.number_of_benches && roomForm.seats_per_bench && (
              <p className="text-xs text-blue-600 mt-2">
                ✓ Total capacity: {parseInt(roomForm.number_of_benches) * parseInt(roomForm.seats_per_bench)} seats
              </p>
            )}
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

      {/* Edit Room Modal */}
      <Modal open={editModalOpen} title="Edit Room" onClose={()=>setEditModalOpen(false)}>
        <form onSubmit={handleUpdate} className="p-4 space-y-4">
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

          <div className="col-span-2 border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">🎫 Seating Layout (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Benches (Rows)</label>
                <input
                  type="number"
                  value={roomForm.number_of_benches}
                  onChange={(e) => {
                    const benches = parseInt(e.target.value) || ''
                    const seats = parseInt(roomForm.seats_per_bench) || 0
                    setRoomForm({
                      ...roomForm, 
                      number_of_benches: e.target.value,
                      capacity: benches && seats ? benches * seats : roomForm.capacity
                    })
                  }}
                  className="input w-full"
                  min="0"
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seats per Bench</label>
                <input
                  type="number"
                  value={roomForm.seats_per_bench}
                  onChange={(e) => {
                    const seats = parseInt(e.target.value) || ''
                    const benches = parseInt(roomForm.number_of_benches) || 0
                    setRoomForm({
                      ...roomForm, 
                      seats_per_bench: e.target.value,
                      capacity: benches && seats ? benches * seats : roomForm.capacity
                    })
                  }}
                  className="input w-full"
                  min="0"
                  placeholder="e.g., 6"
                />
              </div>
            </div>
            {roomForm.number_of_benches && roomForm.seats_per_bench && (
              <p className="text-xs text-blue-600 mt-2">
                ✓ Total capacity: {parseInt(roomForm.number_of_benches) * parseInt(roomForm.seats_per_bench)} seats
              </p>
            )}
          </div>

          {formError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <p className="text-red-800 text-sm">{formError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div className="p-4 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this room? This action cannot be undone.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
            <p className="text-yellow-800 text-sm">⚠️ If this room has seat allotments, the deletion will fail.</p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        type={confirmDialog.type}
      />
    </div>
  )
}
