import React, {useState, useEffect} from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Modal from '../components/Modal'

export default function FinalAllotment(){
  const { isAdmin } = useAuth()
  const { students, exams, rooms } = useData()
  
  // State for totals (admin editable)
  const [totalStudentsAlloted, setTotalStudentsAlloted] = useState(() => {
    const saved = localStorage.getItem('totalStudentsAlloted')
    return saved ? parseInt(saved, 10) : 0
  })
  const [totalRoomsUsed, setTotalRoomsUsed] = useState(() => {
    const saved = localStorage.getItem('totalRoomsUsed')
    return saved ? parseInt(saved, 10) : 0
  })

  // State for allotments (seat assignments)
  const [allotments, setAllotments] = useState(() => {
    try {
      const saved = localStorage.getItem('seatAllotments')
      return saved ? JSON.parse(saved) : []
    } catch(e) { return [] }
  })

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [examFilter, setExamFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [autoAllotModalOpen, setAutoAllotModalOpen] = useState(false)
  
  // Form state for allotment
  const emptyForm = { studentId:'', studentName:'', course:'', examination:'', roomNo:'', seatNo:'' }
  const [form, setForm] = useState(emptyForm)
  
  // Automatic allotment state
  const [autoAllotForm, setAutoAllotForm] = useState({ examId: '', roomIds: [] })
  const [allotmentMode, setAllotmentMode] = useState('view') // 'view', 'manual', 'automatic'

  // Persist totals and allotments
  useEffect(() => { localStorage.setItem('totalStudentsAlloted', String(totalStudentsAlloted)) }, [totalStudentsAlloted])
  useEffect(() => { localStorage.setItem('totalRoomsUsed', String(totalRoomsUsed)) }, [totalRoomsUsed])
  useEffect(() => { localStorage.setItem('seatAllotments', JSON.stringify(allotments)) }, [allotments])

  // Auto-calculate totals from allotments
  useEffect(() => {
    if(allotments.length > 0) {
      setTotalStudentsAlloted(allotments.length)
      const uniqueRooms = new Set(allotments.map(a => a.roomNo).filter(r => r))
      setTotalRoomsUsed(uniqueRooms.size)
    }
  }, [allotments])

  // Form handlers
  useEffect(()=>{
    if(editingId){
      const a = allotments.find(x=>x.id===editingId)
      if(a) setForm(a)
    } else setForm(emptyForm)
  }, [editingId, allotments])

  function upd(k,v){ setForm(s=>({...s,[k]:v})) }

  function openAdd(){ setEditingId(null); setModalOpen(true) }
  function openEdit(id){ setEditingId(id); setModalOpen(true) }
  function confirmDelete(id){ setDeleteId(id) }

  function submitForm(e){
    e.preventDefault()
    if(editingId){
      setAllotments(list => list.map(x => x.id === editingId ? {...x, ...form} : x))
    } else {
      setAllotments(list => [...list, {...form, id: Date.now().toString()}])
    }
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function doDelete(){
    if(deleteId){
      setAllotments(list => list.filter(x => x.id !== deleteId))
      setDeleteId(null)
    }
  }

  // Automatic Allotment Logic
  function performAutomaticAllotment(){
    const { examId, roomIds } = autoAllotForm
    
    if(!examId || roomIds.length === 0){
      alert('Please select an exam and at least one room')
      return
    }

    const selectedExam = exams.find(e => e.id === examId)
    if(!selectedExam){
      alert('Selected exam not found')
      return
    }

    // Get students who match the exam's course/subject
    const eligibleStudents = students.filter(s => 
      s.dept && selectedExam.subject && 
      (s.dept.toLowerCase().includes(selectedExam.subject.toLowerCase()) ||
       selectedExam.subject.toLowerCase().includes(s.dept.toLowerCase()))
    )

    if(eligibleStudents.length === 0){
      alert('No eligible students found for this exam')
      return
    }

    // Sort students by studentId (USN)
    const sortedStudents = [...eligibleStudents].sort((a, b) => 
      (a.studentId || '').localeCompare(b.studentId || '')
    )

    // Get selected rooms and their capacities
    const selectedRooms = rooms.filter(r => roomIds.includes(r.id))
    
    if(selectedRooms.length === 0){
      alert('Selected rooms not found')
      return
    }

    // Calculate total capacity
    const totalCapacity = selectedRooms.reduce((sum, room) => 
      sum + (parseInt(room.capacity) || 0), 0
    )

    if(sortedStudents.length > totalCapacity){
      alert(`Not enough capacity! Students: ${sortedStudents.length}, Total Capacity: ${totalCapacity}`)
      return
    }

    // Allocate seats
    const newAllotments = []
    let studentIndex = 0
    
    for(const room of selectedRooms){
      const roomCapacity = parseInt(room.capacity) || 0
      
      for(let seatNum = 1; seatNum <= roomCapacity && studentIndex < sortedStudents.length; seatNum++){
        const student = sortedStudents[studentIndex]
        
        newAllotments.push({
          id: Date.now().toString() + '_' + studentIndex,
          studentId: student.studentId,
          studentName: student.fullName,
          course: student.dept,
          examination: selectedExam.subject,
          roomNo: room.roomNumber,
          seatNo: seatNum.toString()
        })
        
        studentIndex++
      }
      
      if(studentIndex >= sortedStudents.length) break
    }

    // Add to existing allotments
    setAllotments(prev => [...prev, ...newAllotments])
    setAutoAllotModalOpen(false)
    setAutoAllotForm({ examId: '', roomIds: [] })
    alert(`Successfully allocated ${newAllotments.length} students!`)
  }

  function openManualAllot(){
    setAllotmentMode('manual')
    setEditingId(null)
    setModalOpen(true)
  }

  function openAutoAllot(){
    setAllotmentMode('automatic')
    setAutoAllotModalOpen(true)
  }

  // Filter allotments based on search and filters
  const filteredAllotments = allotments.filter(a => {
    const matchesSearch = !searchTerm || 
      a.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.studentName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCourse = !courseFilter || a.course?.includes(courseFilter)
    const matchesExam = !examFilter || a.examination?.includes(examFilter)
    const matchesRoom = !roomFilter || a.roomNo?.includes(roomFilter)
    
    return matchesSearch && matchesCourse && matchesExam && matchesRoom
  })

  // Get unique values for filter dropdowns
  const uniqueCourses = [...new Set(allotments.map(a => a.course).filter(c => c))]
  const uniqueExams = [...new Set(allotments.map(a => a.examination).filter(e => e))]
  const uniqueRooms = [...new Set(allotments.map(a => a.roomNo).filter(r => r))]

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">FINAL SEAT ALLOTMENT</h2>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-2">TOTAL STUDENTS ALLOTED</div>
          {isAdmin ? (
            <input type="number" value={totalStudentsAlloted} onChange={e=>setTotalStudentsAlloted(Number(e.target.value))} className="input w-32" />
          ) : (
            <div className="text-2xl font-semibold">{totalStudentsAlloted}</div>
          )}
        </div>
        
        <div className="card">
          <div className="text-sm text-gray-600 mb-2">TOTAL ROOMS USED</div>
          {isAdmin ? (
            <input type="number" value={totalRoomsUsed} onChange={e=>setTotalRoomsUsed(Number(e.target.value))} className="input w-32" />
          ) : (
            <div className="text-2xl font-semibold">{totalRoomsUsed}</div>
          )}
        </div>
      </div>

      <div className="bg-gray-200 p-4 mb-4">
        <div className="grid grid-cols-4 gap-4 mb-3">
          <input 
            value={searchTerm} 
            onChange={e=>setSearchTerm(e.target.value)} 
            placeholder="Search By Student Name Or Id" 
            className="input" 
          />
          <select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)} className="input">
            <option value="">All Courses</option>
            {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={examFilter} onChange={e=>setExamFilter(e.target.value)} className="input">
            <option value="">All Exams</option>
            {uniqueExams.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={roomFilter} onChange={e=>setRoomFilter(e.target.value)} className="input">
            <option value="">All Rooms</option>
            {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        
        {isAdmin && (
          <div className="flex justify-end gap-3">
            <button 
              onClick={openManualAllot} 
              className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition duration-200 flex items-center gap-2"
            >
              <span>✏️</span> Manual Allotment
            </button>
            <button 
              onClick={openAutoAllot} 
              className="bg-green-400 hover:bg-green-500 text-white px-4 py-2 rounded shadow transition duration-200 flex items-center gap-2"
            >
              <span>⚡</span> Automatic Allotment
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3">Student Id</th>
              <th className="border p-3">Student Name</th>
              <th className="border p-3">Course</th>
              <th className="border p-3">Examination</th>
              <th className="border p-3">Room No</th>
              <th className="border p-3">Seat No</th>
              {isAdmin && <th className="border p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAllotments.length === 0 && (
              <tr className="h-12">
                <td className="border p-4 text-center text-gray-500" colSpan={isAdmin ? 7 : 6}>
                  {allotments.length === 0 ? 'No allotments yet' : 'No matching allotments found'}
                </td>
              </tr>
            )}
            {filteredAllotments.map(a => (
              <tr key={a.id} className="h-12 hover:bg-gray-50">
                <td className="border p-2">{a.studentId}</td>
                <td className="border p-2">{a.studentName}</td>
                <td className="border p-2">{a.course}</td>
                <td className="border p-2">{a.examination}</td>
                <td className="border p-2">{a.roomNo}</td>
                <td className="border p-2">{a.seatNo}</td>
                {isAdmin && (
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit(a.id)} className="px-2 py-1 bg-yellow-200 rounded text-sm">Edit</button>
                      <button onClick={()=>confirmDelete(a.id)} className="px-2 py-1 bg-rose-200 rounded text-sm">Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit Allotment' : 'Manual Seat Allotment'} onClose={()=>{ setModalOpen(false); setEditingId(null) }}>
        <form onSubmit={submitForm} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <span className="mr-2">👤</span> Student Selection
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Select Student *</label>
                <select 
                  value={form.studentId} 
                  onChange={e => {
                    const student = students.find(s => s.studentId === e.target.value)
                    if(student){
                      upd('studentId', student.studentId)
                      upd('studentName', student.fullName)
                      upd('course', student.dept)
                    }
                  }} 
                  className="input w-full"
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.studentId}>
                      {s.studentId} - {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Student Name</label>
                <input 
                  value={form.studentName} 
                  className="input w-full bg-gray-100" 
                  readOnly 
                  placeholder="Auto-filled"
                />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
              <span className="mr-2">📝</span> Exam & Room Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Course/Subject</label>
                <input 
                  value={form.course} 
                  onChange={e=>upd('course', e.target.value)}
                  className="input w-full bg-gray-100" 
                  readOnly 
                  placeholder="Auto-filled from student"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Examination *</label>
                <select 
                  value={form.examination} 
                  onChange={e=>upd('examination', e.target.value)} 
                  className="input w-full"
                  required
                >
                  <option value="">-- Select Exam --</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.subject}>
                      {ex.subject} ({ex.date})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Room Number *</label>
                <select 
                  value={form.roomNo} 
                  onChange={e=>upd('roomNo', e.target.value)} 
                  className="input w-full"
                  required
                >
                  <option value="">-- Select Room --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.roomNumber}>
                      {r.roomNumber} (Capacity: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Seat Number *</label>
                <input 
                  type="number" 
                  value={form.seatNo} 
                  onChange={e=>upd('seatNo', e.target.value)} 
                  className="input w-full"
                  placeholder="Enter seat number"
                  required
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              type="button" 
              onClick={()=>{ setModalOpen(false); setEditingId(null) }} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded shadow-lg transition duration-200"
            >
              {editingId ? '✓ Update Allotment' : '+ Assign Seat'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Automatic Allotment Modal */}
      <Modal open={autoAllotModalOpen} title="⚡ Automatic Seat Allotment" onClose={()=>setAutoAllotModalOpen(false)}>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center">
              <span className="mr-2">ℹ️</span> How Automatic Allotment Works
            </h4>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>Students are matched with the selected exam based on their course/department</li>
              <li>Seats are assigned automatically sorted by Student ID (USN)</li>
              <li>Students are distributed across selected rooms based on room capacity</li>
              <li>Seat numbers start from 1 in each room</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Select Examination *</label>
              <select 
                value={autoAllotForm.examId} 
                onChange={e => setAutoAllotForm(prev => ({...prev, examId: e.target.value}))} 
                className="input w-full"
                required
              >
                <option value="">-- Select Exam --</option>
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.subject} - {ex.date} ({ex.time})
                  </option>
                ))}
              </select>
              {autoAllotForm.examId && (
                <p className="text-xs text-gray-600 mt-1">
                  Students from matching courses will be auto-selected
                </p>
              )}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Select Rooms * (Multiple)</label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                {rooms.length === 0 ? (
                  <p className="text-sm text-gray-500">No rooms available. Please add rooms first.</p>
                ) : (
                  rooms.map(room => (
                    <label key={room.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoAllotForm.roomIds.includes(room.id)}
                        onChange={e => {
                          if(e.target.checked){
                            setAutoAllotForm(prev => ({...prev, roomIds: [...prev.roomIds, room.id]}))
                          } else {
                            setAutoAllotForm(prev => ({...prev, roomIds: prev.roomIds.filter(id => id !== room.id)}))
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        <strong>{room.roomNumber}</strong> - {room.building || 'N/A'} 
                        <span className="text-gray-600"> (Capacity: {room.capacity})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              {autoAllotForm.roomIds.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ {autoAllotForm.roomIds.length} room(s) selected | Total Capacity: {
                    rooms.filter(r => autoAllotForm.roomIds.includes(r.id))
                      .reduce((sum, r) => sum + (parseInt(r.capacity) || 0), 0)
                  }
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              type="button" 
              onClick={()=>setAutoAllotModalOpen(false)} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition duration-200"
            >
              Cancel
            </button>
            <button 
              onClick={performAutomaticAllotment}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white rounded shadow-lg transition duration-200 flex items-center gap-2"
            >
              <span>⚡</span> Generate Allotments
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
    </div>
  )
}
