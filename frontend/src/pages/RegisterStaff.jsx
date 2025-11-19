import React, {useState, useEffect, useRef} from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { uploadAPI } from '../services/api'

export default function RegisterStaff(){
  const { isAdmin } = useAuth()
  const [invigilators, setInvigilators] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadErrors, setUploadErrors] = useState([])
  const fileInputRef = useRef(null)
  
  // Manual add state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [invigilatorForm, setInvigilatorForm] = useState({
    id: null,
    invigilator_id: '',
    name: ''
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (isAdmin) {
      loadInvigilators()
    }
  }, [isAdmin])

  async function loadInvigilators() {
    try {
      setLoading(true)
      const data = await uploadAPI.getInvigilators()
      setInvigilators(data)
    } catch (error) {
      console.error('Failed to load invigilators:', error)
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
      const result = await uploadAPI.uploadInvigilators(file)
      setUploadSuccess(`✓ Successfully imported ${result.successCount} invigilator(s)`)
      
      if (result.errors && result.errors.length > 0) {
        setUploadErrors(result.errors.map(err => `${err.invigilator_id}: ${err.error}`))
      }

      // Reload invigilators list
      await loadInvigilators()

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
    setInvigilatorForm({
      id: null,
      invigilator_id: '',
      name: ''
    })
    setFormError('')
  }

  function openEditModal(invigilator) {
    setEditModalOpen(true)
    setInvigilatorForm({
      id: invigilator.id,
      invigilator_id: invigilator.invigilator_id,
      name: invigilator.name
    })
    setFormError('')
  }

  async function handleManualAdd(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      await uploadAPI.addInvigilator(invigilatorForm)
      await loadInvigilators()
      setAddModalOpen(false)
      alert('Invigilator added successfully!')
    } catch (error) {
      setFormError(error.message || 'Failed to add invigilator')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      const { id, ...data } = invigilatorForm
      await uploadAPI.updateInvigilator(id, data)
      await loadInvigilators()
      setEditModalOpen(false)
      alert('Invigilator updated successfully!')
    } catch (error) {
      setFormError(error.message || 'Failed to update invigilator')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    
    try {
      setLoading(true)
      await uploadAPI.deleteInvigilator(deleteId)
      await loadInvigilators()
      setDeleteId(null)
      alert('Invigilator deleted successfully!')
    } catch (error) {
      alert(error.message || 'Failed to delete invigilator')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 dark:text-white">REGISTER INVIGILATORS</h2>

      <div className="bg-white dark:bg-gray-800 p-4 mb-6 shadow rounded">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium dark:text-white">Invigilators List ({invigilators.length})</h3>
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border dark:border-gray-600 p-2 dark:text-white">Invigilator ID</th>
                <th className="border dark:border-gray-600 p-2 dark:text-white">Name</th>
                {isAdmin && (
                  <th className="border dark:border-gray-600 p-2 dark:text-white">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {invigilators.map(inv=> (
                <tr key={inv.id} className="h-12 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{inv.invigilator_id}</td>
                  <td className="border dark:border-gray-600 p-2 dark:text-gray-200">{inv.name}</td>
                  {isAdmin && (
                    <td className="border dark:border-gray-600 p-2">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => openEditModal(inv)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteId(inv.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {invigilators.length===0 && !loading && (
                <tr className="h-12"><td className="p-4 text-center text-gray-500 dark:text-gray-400" colSpan={isAdmin ? 3 : 2}>No invigilators yet. Upload a file to add invigilators.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal open={uploadModalOpen} title="Import Invigilators from Excel/CSV" onClose={()=>setUploadModalOpen(false)}>
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📋 File Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-2">Your Excel/CSV file must contain the following columns:</p>
            <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono">
              name, invigilator_id
            </div>
            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>• <strong>name</strong>: Full name of the invigilator</p>
              <p>• <strong>invigilator_id</strong>: Unique ID (e.g., INV001)</p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-gray-50 p-3 rounded border">
            <h5 className="text-sm font-semibold mb-2">Example content:</h5>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`name,invigilator_id
Dr. Robert Smith,INV001
Prof. Maria Johnson,INV002`}
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
      <Modal open={addModalOpen} title="Add Invigilator Manually" onClose={()=>setAddModalOpen(false)}>
        <form onSubmit={handleManualAdd} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invigilator ID *</label>
            <input
              type="text"
              value={invigilatorForm.invigilator_id}
              onChange={(e) => setInvigilatorForm({...invigilatorForm, invigilator_id: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., INV001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={invigilatorForm.name}
              onChange={(e) => setInvigilatorForm({...invigilatorForm, name: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., Dr. Robert Smith"
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
              {loading ? 'Adding...' : 'Add Invigilator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Invigilator Modal */}
      <Modal open={editModalOpen} title="Edit Invigilator" onClose={()=>setEditModalOpen(false)}>
        <form onSubmit={handleUpdate} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invigilator ID *</label>
            <input
              type="text"
              value={invigilatorForm.invigilator_id}
              onChange={(e) => setInvigilatorForm({...invigilatorForm, invigilator_id: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., INV001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={invigilatorForm.name}
              onChange={(e) => setInvigilatorForm({...invigilatorForm, name: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., Dr. Robert Smith"
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
              {loading ? 'Updating...' : 'Update Invigilator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div className="p-4 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this invigilator? This action cannot be undone.
          </p>
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
    </div>
  )
}
