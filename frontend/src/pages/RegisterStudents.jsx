import React, {useState, useEffect, useRef} from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import Papa from 'papaparse'

export default function RegisterStudents(){
  const { students, addStudent, updateStudent, deleteStudent } = useData()
  const { isAdmin } = useAuth()

  const empty = { studentId:'', fullName:'', dob:'', dept:'', year:'' }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [csvErrors, setCsvErrors] = useState([])
  const [csvSuccess, setCsvSuccess] = useState('')
  const fileInputRef = useRef(null)

  useEffect(()=>{
    if(editingId){
      const s = students.find(x=>x.id===editingId)
      if(s) setForm(s)
    } else setForm(empty)
  }, [editingId, students])

  function upd(k,v){ setForm(s=>({...s,[k]:v})) }

  function submit(e){
    e.preventDefault()
    if(editingId){
      updateStudent(editingId, form)
      setEditingId(null)
    } else {
      addStudent(form)
    }
    setForm(empty)
  }

  function openAdd(){ setEditingId(null); setModalOpen(true) }
  function openEdit(id){ setEditingId(id); setModalOpen(true) }
  function confirmDelete(id){ setDeleteId(id) }
  function doDelete(){ if(deleteId){ deleteStudent(deleteId); setDeleteId(null) } }

  function openCsvModal(){ 
    setCsvModalOpen(true); 
    setCsvErrors([]); 
    setCsvSuccess('');
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  function validateRow(row, rowIndex) {
    const errors = []
    const requiredFields = [
      { key: 'studentId', label: 'Student ID' },
      { key: 'fullName', label: 'Full Name' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'dept', label: 'Department/Course' },
      { key: 'year', label: 'Academic Year' }
    ]

    requiredFields.forEach(field => {
      if (!row[field.key] || row[field.key].trim() === '') {
        errors.push(`Row ${rowIndex + 1}: Missing ${field.label}`)
      }
    })

    return errors
  }

  function handleCsvUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setCsvErrors([])
    setCsvSuccess('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const allErrors = []
        const validStudents = []

        // Validate all rows
        results.data.forEach((row, index) => {
          const rowErrors = validateRow(row, index)
          if (rowErrors.length > 0) {
            allErrors.push(...rowErrors)
          } else {
            validStudents.push({
              studentId: row.studentId.trim(),
              fullName: row.fullName.trim(),
              dob: row.dob.trim(),
              dept: row.dept.trim(),
              year: row.year.trim()
            })
          }
        })

        // If any errors, reject entire upload
        if (allErrors.length > 0) {
          setCsvErrors(allErrors)
          return
        }

        // If all valid, add all students
        if (validStudents.length > 0) {
          validStudents.forEach(student => addStudent(student))
          setCsvSuccess(`✓ Successfully imported ${validStudents.length} student(s)`)
          setTimeout(() => {
            setCsvModalOpen(false)
            setCsvSuccess('')
          }, 2000)
        } else {
          setCsvErrors(['No valid student data found in the CSV file'])
        }
      },
      error: function(error) {
        setCsvErrors([`Error parsing CSV: ${error.message}`])
      }
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">REGISTER STUDENTS</h2>

      <div className="bg-white p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Students List</h3>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={openCsvModal} className="bg-green-400 hover:bg-green-500 px-3 py-1 rounded transition duration-200">
                📁 Import CSV
              </button>
              <button onClick={openAdd} className="bg-rose-300 hover:bg-rose-400 px-3 py-1 rounded transition duration-200">
                + Add Student
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Course</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s=> (
                <tr key={s.id} className="h-12">
                  <td className="border p-2">{s.studentId}</td>
                  <td className="border p-2">{s.fullName}</td>
                  <td className="border p-2">{s.dept}</td>
                  <td className="border p-2">
                    {isAdmin ? (
                      <div className="flex gap-2">
                        <button onClick={()=>openEdit(s.id)} className="px-2 py-1 bg-yellow-200 rounded">Edit</button>
                        <button onClick={()=>confirmDelete(s.id)} className="px-2 py-1 bg-rose-200 rounded">Delete</button>
                      </div>
                    ) : <span className="text-sm text-gray-500">—</span>}
                  </td>
                </tr>
              ))}
              {students.length===0 && (
                <tr className="h-12"><td className="p-4" colSpan={4}>No students yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit Student' : 'Add Student'} onClose={()=>{ setModalOpen(false); setEditingId(null) }}>
        <div className="p-2">
          <form onSubmit={(e)=>{ submit(e); setModalOpen(false); }} className="space-y-6">
            {/* Student Basic Info */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></div>
                Student Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student ID *</label>
                  <input 
                    value={form.studentId} 
                    onChange={e=>upd('studentId', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter student ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input 
                    value={form.fullName} 
                    onChange={e=>upd('fullName', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input 
                    value={form.dob} 
                    onChange={e=>upd('dob', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="YYYY-MM-DD"
                    type="date"
                  />
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <div className="w-2 h-2 bg-rose-500 rounded-full mr-3"></div>
                Academic Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department/Course *</label>
                  <input 
                    value={form.dept} 
                    onChange={e=>upd('dept', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter department"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <input 
                    value={form.year} 
                    onChange={e=>upd('year', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter academic year"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              {isAdmin ? (
                <button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105">
                  {editingId ? '✓ Update Student' : '+ Register Student'}
                </button>
              ) : (
                <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">Only Admin can register students</div>
              )}
            </div>
          </form>
        </div>
      </Modal>

      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div>Are you sure you want to delete this student?</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={()=>setDeleteId(null)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
          <button onClick={()=>{ doDelete(); }} className="px-3 py-1 bg-rose-300 rounded">Delete</button>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={csvModalOpen} title="Import Students from CSV" onClose={()=>setCsvModalOpen(false)}>
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📋 CSV Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-2">Your CSV file must contain the following columns with exact headers:</p>
            <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono">
              studentId, fullName, dob, dept, year
            </div>
            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>• <strong>Student ID</strong>: Unique identifier for the student</p>
              <p>• <strong>Full Name</strong>: Complete name of the student</p>
              <p>• <strong>Date of Birth</strong>: Format: YYYY-MM-DD (e.g., 2003-05-15)</p>
              <p>• <strong>Department/Course</strong>: Student's department (dept)</p>
              <p>• <strong>Academic Year</strong>: Current academic year (year)</p>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <h4 className="font-semibold text-amber-900 mb-2">⚠️ Important Rules</h4>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li><strong>All fields are mandatory</strong> for every student</li>
              <li>If any field is missing or empty, the entire import will be rejected</li>
              <li>No student data will be added to the database if validation fails</li>
              <li>Check error messages carefully and fix your CSV before re-uploading</li>
            </ul>
          </div>

          {/* Example CSV */}
          <div className="bg-gray-50 p-3 rounded border">
            <h5 className="text-sm font-semibold mb-2">Example CSV content:</h5>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`studentId,fullName,dob,dept,year
ST001,John Doe,2003-01-15,Computer Science,2023
ST002,Jane Smith,2002-08-22,Electronics,2023`}
            </pre>
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv"
              onChange={handleCsvUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
          </div>

          {/* Success Message */}
          {csvSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-800 font-medium">{csvSuccess}</p>
            </div>
          )}

          {/* Error Messages */}
          {csvErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded max-h-64 overflow-y-auto">
              <h4 className="font-semibold text-red-900 mb-2">❌ Validation Errors</h4>
              <p className="text-sm text-red-800 mb-2">
                The CSV file cannot be imported. Please fix the following errors:
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                {csvErrors.map((err, idx) => (
                  <li key={idx} className="font-mono text-xs">• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
