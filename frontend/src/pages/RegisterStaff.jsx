import React, {useState, useEffect, useRef} from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import Papa from 'papaparse'

export default function RegisterStaff(){
  const { staff, addStaff, updateStaff, deleteStaff } = useData()
  const { isAdmin } = useAuth()

  const empty = { facultyId:'', fullName:'', department:'' }
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
      const s = staff.find(x=>x.id===editingId)
      if(s) setForm(s)
    } else setForm(empty)
  }, [editingId, staff])

  function upd(k,v){ setForm(s=>({...s,[k]:v})) }

  function submit(e){
    e.preventDefault()
    if(editingId){
      updateStaff(editingId, form)
      setEditingId(null)
    } else {
      addStaff(form)
    }
    setForm(empty)
  }

  function openAdd(){ setEditingId(null); setModalOpen(true) }
  function openEdit(id){ setEditingId(id); setModalOpen(true) }
  function confirmDelete(id){ setDeleteId(id) }
  function doDelete(){ if(deleteId){ deleteStaff(deleteId); setDeleteId(null) } }

  function openCsvModal(){ 
    setCsvModalOpen(true); 
    setCsvErrors([]); 
    setCsvSuccess('');
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  function validateRow(row, rowIndex) {
    const errors = []
    const requiredFields = [
      { key: 'facultyId', label: 'Faculty ID' },
      { key: 'fullName', label: 'Full Name' },
      { key: 'department', label: 'Department' }
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
        const validStaff = []

        // Validate all rows
        results.data.forEach((row, index) => {
          const rowErrors = validateRow(row, index)
          if (rowErrors.length > 0) {
            allErrors.push(...rowErrors)
          } else {
            validStaff.push({
              facultyId: row.facultyId.trim(),
              fullName: row.fullName.trim(),
              department: row.department.trim()
            })
          }
        })

        // If any errors, reject entire upload
        if (allErrors.length > 0) {
          setCsvErrors(allErrors)
          return
        }

        // If all valid, add all staff
        if (validStaff.length > 0) {
          validStaff.forEach(staffMember => addStaff(staffMember))
          setCsvSuccess(`✓ Successfully imported ${validStaff.length} staff member(s)`)
          setTimeout(() => {
            setCsvModalOpen(false)
            setCsvSuccess('')
          }, 2000)
        } else {
          setCsvErrors(['No valid staff data found in the CSV file'])
        }
      },
      error: function(error) {
        setCsvErrors([`Error parsing CSV: ${error.message}`])
      }
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">REGISTER STAFF</h2>

      <div className="bg-white p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Staff List</h3>
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={openCsvModal} className="bg-green-400 hover:bg-green-500 px-3 py-1 rounded transition duration-200">
                📁 Import CSV
              </button>
              <button onClick={openAdd} className="bg-rose-300 hover:bg-rose-400 px-3 py-1 rounded transition duration-200">
                + Add Staff
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Faculty ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Department</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s=> (
                <tr key={s.id} className="h-12">
                  <td className="border p-2">{s.facultyId}</td>
                  <td className="border p-2">{s.fullName}</td>
                  <td className="border p-2">{s.department}</td>
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
              {staff.length===0 && (
                <tr className="h-12"><td className="p-4" colSpan={4}>No staff members yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit Staff' : 'Add Staff'} onClose={()=>{ setModalOpen(false); setEditingId(null) }}>
        <div className="p-2">
          <form onSubmit={(e)=>{ submit(e); setModalOpen(false); }} className="space-y-6">
            {/* Staff Basic Info */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></div>
                Staff Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faculty ID *</label>
                  <input 
                    value={form.facultyId} 
                    onChange={e=>upd('facultyId', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter faculty ID"
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                  <input 
                    value={form.department} 
                    onChange={e=>upd('department', e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter department"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              {isAdmin ? (
                <button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105">
                  {editingId ? '✓ Update Staff' : '+ Register Staff'}
                </button>
              ) : (
                <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">Only Admin can register staff</div>
              )}
            </div>
          </form>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={csvModalOpen} title="Import Staff from CSV" onClose={()=>setCsvModalOpen(false)}>
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📋 CSV Format Requirements</h4>
            <p className="text-sm text-blue-800 mb-2">Your CSV file must contain the following columns with exact headers:</p>
            <div className="bg-white p-3 rounded border border-blue-200 text-sm font-mono">
              facultyId, fullName, department
            </div>
            <div className="mt-3 space-y-1 text-sm text-blue-800">
              <p>• <strong>Faculty ID</strong>: Unique identifier for the staff member</p>
              <p>• <strong>Full Name</strong>: Complete name of the staff member</p>
              <p>• <strong>Department</strong>: Department name (e.g., Computer Science, Mathematics)</p>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <h4 className="font-semibold text-amber-900 mb-2">⚠️ Important Rules</h4>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li><strong>All fields are mandatory</strong> for every staff member</li>
              <li>If any field is missing or empty, the entire import will be rejected</li>
              <li>No staff data will be added to the database if validation fails</li>
              <li>Check error messages carefully and fix your CSV before re-uploading</li>
            </ul>
          </div>

          {/* Example CSV */}
          <div className="bg-gray-50 p-3 rounded border">
            <h5 className="text-sm font-semibold mb-2">Example CSV content:</h5>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`facultyId,fullName,department
FAC001,Dr. John Smith,Computer Science
FAC002,Prof. Jane Doe,Mathematics
FAC003,Dr. Robert Brown,Physics`}
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

      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div>Are you sure you want to delete this staff member?</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={()=>setDeleteId(null)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
          <button onClick={()=>{ doDelete(); }} className="px-3 py-1 bg-rose-300 rounded">Delete</button>
        </div>
      </Modal>
    </div>
  )
}
