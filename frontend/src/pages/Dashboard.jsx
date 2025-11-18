import React, {useState, useEffect} from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import Modal from '../components/Modal'

export default function Dashboard(){
  const { isAdmin, role, studentId } = useAuth()

  const [totalRooms, setTotalRooms] = useState(() => {
    const saved = localStorage.getItem('totalRooms')
    return saved ? parseInt(saved, 10) : 0 // default to 5 instead of 0
  })
  const [totalCapacity, setTotalCapacity] = useState(() => {
    const saved = localStorage.getItem('totalCapacity') 
    return saved ? parseInt(saved, 10) : 0 // default to 600 instead of 0
  })
  const [upcomingExams, setUpcomingExams] = useState(() => {
    return localStorage.getItem('upcomingExams') || ''
  })

  const { exams, addExam, updateExam, deleteExam, rooms, students } = useData()
  const [examModalOpen, setExamModalOpen] = useState(false)
  const [editingExamId, setEditingExamId] = useState(null)
  const [examForm, setExamForm] = useState({ name:'', start:'', end:'', subjects:'' })

  // Get seat allotments from localStorage for staff view
  const [allotments, setAllotments] = useState(() => {
    try {
      const saved = localStorage.getItem('seatAllotments')
      return saved ? JSON.parse(saved) : []
    } catch(e) { return [] }
  })

  // Update defaults from rooms if available (but only if not manually set)
  useEffect(()=>{
    if(rooms && rooms.length > 0 && totalRooms === 5) {
      // Only auto-update if it's still the default value
      setTotalRooms(rooms.length)
    }
    if(rooms && rooms.length > 0 && totalCapacity === 600) {
      // Only auto-update if it's still the default value
      const capFromRooms = rooms.reduce((s,r)=>s + (Number(r.capacity)||0), 0)
      if(capFromRooms > 0) setTotalCapacity(capFromRooms)
    }
  }, [rooms, totalRooms, totalCapacity])

  useEffect(()=>{
    if(editingExamId){
      const e = exams.find(x=>x.id===editingExamId)
      if(e) setExamForm(e)
    } else setExamForm({ name:'', start:'', end:'', subjects:'' })
  }, [editingExamId, exams])

  function openExamAdd(){ setEditingExamId(null); setExamModalOpen(true) }
  function openExamEdit(id){ setEditingExamId(id); setExamModalOpen(true) }
  function submitExam(e){
    e.preventDefault()
    if(editingExamId) updateExam(editingExamId, examForm)
    else addExam(examForm)
    setExamModalOpen(false)
    setEditingExamId(null)
  }
  function confirmDeleteExam(id){ if(window.confirm('Delete this exam?')) deleteExam(id) }

  useEffect(() => { localStorage.setItem('totalRooms', String(totalRooms)) }, [totalRooms])
  useEffect(() => { localStorage.setItem('totalCapacity', String(totalCapacity)) }, [totalCapacity])
  useEffect(() => { localStorage.setItem('upcomingExams', upcomingExams) }, [upcomingExams])

  // Student-specific view
  if(role === 'student') {
    // Find student's seat allotment
    const myAllotment = allotments.find(a => a.studentId === studentId)
    
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Student Dashboard</h2>
        
        {!myAllotment ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <div className="text-xl font-semibold text-gray-800 mb-2">No Seat Allotment Yet</div>
            <div className="text-gray-600">Your seat will be assigned soon. Please check back later.</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 bg-cyan-500 rounded-full mr-3"></div>
                Your Exam Room
              </h3>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Room Number</div>
                    <div className="text-3xl font-bold text-cyan-600">{myAllotment.roomNo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Your Seat Number</div>
                    <div className="text-3xl font-bold text-rose-600">{myAllotment.seatNo}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                Your Examination Details
              </h3>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Student ID</div>
                    <div className="text-lg font-semibold text-gray-800">{myAllotment.studentId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Student Name</div>
                    <div className="text-lg font-semibold text-gray-800">{myAllotment.studentName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Course</div>
                    <div className="text-lg font-semibold text-gray-800">{myAllotment.course}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Examination</div>
                    <div className="text-lg font-semibold text-gray-800">{myAllotment.examination}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 bg-rose-500 rounded-full mr-3"></div>
                Exam Schedule & Subjects
              </h3>
              {exams.filter(exam => exam.name?.toLowerCase().includes(myAllotment.examination?.toLowerCase())).length > 0 ? (
                <div className="space-y-3">
                  {exams.filter(exam => exam.name?.toLowerCase().includes(myAllotment.examination?.toLowerCase())).map(exam => (
                    <div key={exam.id} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-rose-400">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-xl text-gray-800">{exam.name}</div>
                        </div>
                        <div className="bg-rose-100 px-3 py-1 rounded-full text-sm font-medium text-rose-700">
                          Scheduled
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-4 pt-3 border-t">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Start Time</div>
                          <div className="font-medium text-gray-800">{exam.start}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">End Time</div>
                          <div className="font-medium text-gray-800">{exam.end}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Room</div>
                          <div className="font-medium text-cyan-600">{myAllotment.roomNo}</div>
                        </div>
                      </div>
                      {exam.subjects && (
                        <div className="pt-3 border-t">
                          <div className="text-xs text-gray-500 mb-2">Subjects</div>
                          <div className="flex flex-wrap gap-2">
                            {exam.subjects.split(',').map((subject, idx) => (
                              <span key={idx} className="bg-purple-100 px-3 py-1 rounded-full text-sm text-purple-800">
                                {subject.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm text-center text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <div>Exam schedule will be updated soon</div>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-start">
                <div className="text-green-600 mr-3 text-2xl">✓</div>
                <div>
                  <div className="font-semibold text-gray-800 mb-2">Important Instructions for Students</div>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li>• Arrive at least 20 minutes before the exam start time</li>
                    <li>• Bring your student ID card and hall ticket</li>
                    <li>• Find your assigned seat number: <span className="font-bold text-rose-600">{myAllotment.seatNo}</span> in room <span className="font-bold text-cyan-600">{myAllotment.roomNo}</span></li>
                    <li>• Mobile phones and electronic devices are strictly prohibited</li>
                    <li>• Follow all exam instructions carefully</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Staff-specific view
  if(role === 'staff') {
    // Filter students allotted to staff's room (Room 2f08)
    const myRoomStudents = allotments.filter(a => a.roomNo === 'Room 2f08' || a.roomNo === '2f08')
    
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Staff Dashboard</h2>
        
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-3 h-3 bg-cyan-500 rounded-full mr-3"></div>
            Your Assigned Room
          </h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Room Number</div>
                <div className="text-2xl font-bold text-cyan-600">Room 2f08</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Floor</div>
                <div className="text-xl font-semibold text-gray-800">2nd Floor</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Capacity</div>
                <div className="text-xl font-semibold text-gray-800">30 Students</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-xl font-semibold text-green-600">Active</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-3 h-3 bg-rose-500 rounded-full mr-3"></div>
            Exam Schedule & Timings
          </h3>
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-rose-400">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-lg text-gray-800">Mid Semester Examination</div>
                  <div className="text-sm text-gray-600">Session: November 2025</div>
                </div>
                <div className="bg-rose-100 px-3 py-1 rounded-full text-sm font-medium text-rose-700">
                  Upcoming
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                <div>
                  <div className="text-xs text-gray-500">Start Date & Time</div>
                  <div className="font-medium text-gray-800">2025-11-20 09:00 AM</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">End Date & Time</div>
                  <div className="font-medium text-gray-800">2025-11-20 12:00 PM</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="font-medium text-gray-800">3 Hours</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500 mb-1">Subjects</div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-cyan-100 px-3 py-1 rounded-full text-sm text-cyan-800">Mathematics</span>
                  <span className="bg-cyan-100 px-3 py-1 rounded-full text-sm text-cyan-800">Computer Science</span>
                  <span className="bg-cyan-100 px-3 py-1 rounded-full text-sm text-cyan-800">Physics</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-lg text-gray-800">Final Semester Examination</div>
                  <div className="text-sm text-gray-600">Session: December 2025</div>
                </div>
                <div className="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium text-blue-700">
                  Scheduled
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                <div>
                  <div className="text-xs text-gray-500">Start Date & Time</div>
                  <div className="font-medium text-gray-800">2025-12-15 02:00 PM</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">End Date & Time</div>
                  <div className="font-medium text-gray-800">2025-12-15 05:00 PM</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="font-medium text-gray-800">3 Hours</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500 mb-1">Subjects</div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-purple-100 px-3 py-1 rounded-full text-sm text-purple-800">Data Structures</span>
                  <span className="bg-purple-100 px-3 py-1 rounded-full text-sm text-purple-800">Algorithms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
            Students Assigned to Your Room
            <span className="ml-auto bg-purple-100 px-3 py-1 rounded-full text-sm font-medium text-purple-700">
              {myRoomStudents.length} Students
            </span>
          </h3>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {myRoomStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-5xl mb-3">👥</div>
                <div className="font-medium text-gray-700">No Students Assigned Yet</div>
                <div className="text-sm text-gray-500 mt-1">Students will appear here once seat allotment is completed</div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-purple-100 border-b border-purple-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Course</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Examination</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Seat No</th>
                  </tr>
                </thead>
                <tbody>
                  {myRoomStudents.map((student, idx) => (
                    <tr key={student.id || idx} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-800">{student.studentId}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.studentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.course}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.examination}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-cyan-100 px-2 py-1 rounded text-cyan-800 font-medium">
                          {student.seatNo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3 text-xl">ℹ️</div>
            <div>
              <div className="font-semibold text-gray-800 mb-1">Important Instructions</div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Please arrive 15 minutes before the exam starts</li>
                <li>• Ensure proper seating arrangement as per allotment</li>
                <li>• Check student attendance before starting the exam</li>
                <li>• Contact admin for any last-minute changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin view (original dashboard)
  return (
    <div>
      <div className="grid grid-cols-3 gap-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-2">TOTAL ROOMS AVAILABLE</div>
          {isAdmin ? (
            <input type="number" value={totalRooms} onChange={e=>setTotalRooms(Number(e.target.value))} className="input w-32" />
          ) : (
            <div className="text-2xl font-semibold">{totalRooms}</div>
          )}
        </div>

        <div className="card">
          <div className="text-sm text-gray-600 mb-2">TOTAL STUDENTS CAPACITY</div>
          {isAdmin ? (
            <input type="number" value={totalCapacity} onChange={e=>setTotalCapacity(Number(e.target.value))} className="input w-40" />
          ) : (
            <div className="text-2xl font-semibold">{totalCapacity}</div>
          )}
        </div>

        <div className="card">
          <div className="text-sm text-gray-600 mb-2">UPCOMING EXAMS</div>
          {isAdmin ? (
            <input value={upcomingExams} onChange={e=>setUpcomingExams(e.target.value)} placeholder="Comma separated list" className="input" />
          ) : (
            <div>{upcomingExams || '—'}</div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="bg-rose-300 px-4 py-2">SUBJECTS/EXAMS</h2>
          <div className="flex gap-2">
            <div className="bg-pink-200 px-4 py-2">DATE</div>
            <div className="bg-pink-100 px-4 py-2">TIME</div>
            <div className="bg-yellow-200 px-4 py-2">ACTIONS</div>
          </div>
        </div>

        <div className="bg-cyan-200 rounded p-4">
          <div className="flex justify-end mb-2">
            {isAdmin && <button onClick={openExamAdd} className="bg-rose-300 px-3 py-1 rounded">+ Add Exam</button>}
          </div>

          <div className="space-y-3">
            {exams.length===0 && <div className="text-gray-600">No exams yet</div>}
            {exams.map(x=> (
              <div key={x.id} className="bg-white p-3 rounded flex items-center justify-between">
                <div>
                  <div className="font-semibold">{x.name}</div>
                  <div className="text-sm text-gray-600">{x.subjects}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">{x.start}</div>
                  <div className="text-sm">{x.end}</div>
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button onClick={()=>openExamEdit(x.id)} className="px-2 py-1 bg-yellow-200 rounded">Edit</button>
                      <button onClick={()=>confirmDeleteExam(x.id)} className="px-2 py-1 bg-rose-200 rounded">Delete</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={examModalOpen} title={editingExamId ? 'Edit Exam' : 'Add Exam'} onClose={()=>{ setExamModalOpen(false); setEditingExamId(null) }}>
        <form onSubmit={submitExam} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">Exam Name</label>
            <input value={examForm.name} onChange={e=>setExamForm(s=>({...s, name:e.target.value}))} className="input" />
          </div>
          <div>
            <label className="block mb-2">Subjects (comma separated)</label>
            <input value={examForm.subjects} onChange={e=>setExamForm(s=>({...s, subjects:e.target.value}))} className="input" />
          </div>
          <div>
            <label className="block mb-2">Start Date & Time</label>
            <input value={examForm.start} onChange={e=>setExamForm(s=>({...s, start:e.target.value}))} className="input" placeholder="YYYY-MM-DD HH:MM" />
          </div>
          <div>
            <label className="block mb-2">End Date & Time</label>
            <input value={examForm.end} onChange={e=>setExamForm(s=>({...s, end:e.target.value}))} className="input" placeholder="YYYY-MM-DD HH:MM" />
          </div>
          <div className="col-span-2 text-right">
            <button className="bg-rose-300 px-4 py-2 rounded">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
