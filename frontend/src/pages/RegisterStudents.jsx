import React, {useState, useEffect, useRef} from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { uploadAPI } from '../services/api'

export default function RegisterStudents(){
  const { isAdmin } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadErrors, setUploadErrors] = useState([])
  const fileInputRef = useRef(null)
  
  // Manual add state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [studentForm, setStudentForm] = useState({
    id: null,
    name: '',
    roll_no: '',
    date_of_birth: '',
    department: '',
    academic_year: ''
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (isAdmin) {
      loadStudents()
    }
  }, [isAdmin])

  async function loadStudents() {
    try {
      setLoading(true)
      const data = await uploadAPI.getStudents()
      setStudents(data)
    } catch (error) {
      console.error('Failed to load students:', error)
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
      const result = await uploadAPI.uploadStudents(file)
      setUploadSuccess(`✓ Successfully imported ${result.successCount} student(s)`)
      
      if (result.errors && result.errors.length > 0) {
        setUploadErrors(result.errors.map(err => `${err.roll_no}: ${err.error}`))
      }

      // Reload students list
      await loadStudents()

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
    setStudentForm({
      id: null,
      name: '',
      roll_no: '',
      date_of_birth: '',
      department: '',
      academic_year: ''
    })
    setFormError('')
  }

  function openEditModal(student) {
    setEditModalOpen(true)
    setStudentForm({
      id: student.id,
      name: student.name,
      roll_no: student.roll_no,
      date_of_birth: student.date_of_birth,
      department: student.department,
      academic_year: student.academic_year
    })
    setFormError('')
  }

  async function handleManualAdd(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      await uploadAPI.addStudent(studentForm)
      await loadStudents()
      setAddModalOpen(false)
      alert('Student added successfully!')
    } catch (error) {
      setFormError(error.message || 'Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setFormError('')
    setLoading(true)

    try {
      const { id, ...data } = studentForm
      await uploadAPI.updateStudent(id, data)
      await loadStudents()
      setEditModalOpen(false)
      alert('Student updated successfully!')
    } catch (error) {
      setFormError(error.message || 'Failed to update student')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    
    try {
      setLoading(true)
      await uploadAPI.deleteStudent(deleteId)
      await loadStudents()
      setDeleteId(null)
      alert('Student deleted successfully!')
    } catch (error) {
      alert(error.message || 'Failed to delete student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 dark:text-white">REGISTER STUDENTS</h2>

      <div className="bg-white dark:bg-gray-800 p-4 mb-6 shadow rounded">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium dark:text-white">Students List ({students.length})</h3>
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
              <tr className="bg-gray-100">
                <th className="border p-2">Roll No</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">DOB</th>
                <th className="border p-2">Department</th>
                <th className="border p-2">Year</th>
                {isAdmin && <th className="border p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {students.map(s=> (
                <tr key={s.id} className="h-12 hover:bg-gray-50">
                  <td className="border p-2">{s.roll_no}</td>
                  <td className="border p-2">{s.name}</td>
                  <td className="border p-2">{s.date_of_birth}</td>
                  <td className="border p-2">{s.department}</td>
                  <td className="border p-2">{s.academic_year}</td>
                  {isAdmin && (
                    <td className="border p-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEditModal(s)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {students.length===0 && !loading && (
                <tr className="h-12"><td className="p-4 text-center text-gray-500" colSpan={isAdmin ? 6 : 5}>No students yet. Upload a file to add students.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal open={uploadModalOpen} title="Import Students from Excel/CSV" onClose={()=>setUploadModalOpen(false)}>
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📋 File Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-2">Your Excel/CSV file must contain the following columns:</p>
            <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono">
              name, roll_no, date_of_birth, department, academic_year
            </div>
            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>• <strong>name</strong>: Full name of the student</p>
              <p>• <strong>roll_no</strong>: Unique roll number (e.g., CS2021001)</p>
              <p>• <strong>date_of_birth</strong>: Format: YYYY-MM-DD (e.g., 2003-05-15)</p>
              <p>• <strong>department</strong>: Department name (e.g., Computer Science)</p>
              <p>• <strong>academic_year</strong>: Academic year (e.g., 2021-2025)</p>
            </div>
          </div>

          {/* Example */}
          <div className="bg-gray-50 p-3 rounded border">
            <h5 className="text-sm font-semibold mb-2">Example content:</h5>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`name,roll_no,date_of_birth,department,academic_year
John Doe,CS2021001,2003-05-15,Computer Science,2021-2025
Jane Smith,CS2021002,2003-08-20,Computer Science,2021-2025`}
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
      <Modal open={addModalOpen} title="Add Student Manually" onClose={()=>setAddModalOpen(false)}>
        <form onSubmit={handleManualAdd} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={studentForm.name}
              onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
            <input
              type="text"
              value={studentForm.roll_no}
              onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., CS2021001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              value={studentForm.date_of_birth}
              onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <input
              type="text"
              value={studentForm.department}
              onChange={(e) => setStudentForm({...studentForm, department: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., Computer Science"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <input
              type="text"
              value={studentForm.academic_year}
              onChange={(e) => setStudentForm({...studentForm, academic_year: e.target.value})}
              className="input w-full"
              required
              placeholder="e.g., 2021-2025"
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
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModalOpen} title="Edit Student" onClose={()=>setEditModalOpen(false)}>
        <form onSubmit={handleUpdate} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={studentForm.name}
              onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
            <input
              type="text"
              value={studentForm.roll_no}
              onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              value={studentForm.date_of_birth}
              onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <input
              type="text"
              value={studentForm.department}
              onChange={(e) => setStudentForm({...studentForm, department: e.target.value})}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <input
              type="text"
              value={studentForm.academic_year}
              onChange={(e) => setStudentForm({...studentForm, academic_year: e.target.value})}
              className="input w-full"
              required
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
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div className="p-4">
          <p className="text-gray-700 mb-4">Are you sure you want to delete this student? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded transition"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
