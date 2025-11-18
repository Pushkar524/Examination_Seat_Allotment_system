import React, { createContext, useContext, useEffect, useState } from 'react'

const DataContext = createContext(null)

function useLocalState(key, initial){
  const [state, setState] = useState(() => {
    try{
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    }catch(e){ return initial }
  })
  useEffect(()=>{
    try{ localStorage.setItem(key, JSON.stringify(state)) }catch(e){}
  }, [key, state])
  return [state, setState]
}

export function DataProvider({children}){
  const [students, setStudents] = useLocalState('students', [])
  const [rooms, setRooms] = useLocalState('rooms', [])
  const [exams, setExams] = useLocalState('exams', [])
  const [staff, setStaff] = useLocalState('staff', [])

  // Students CRUD
  function addStudent(student){
    setStudents(s=>[...s, {...student, id: Date.now().toString()}])
  }
  function updateStudent(id, patch){
    setStudents(s=>s.map(x=> x.id===id ? {...x, ...patch} : x))
  }
  function deleteStudent(id){
    setStudents(s=>s.filter(x=>x.id!==id))
  }

  // Rooms CRUD
  function addRoom(room){
    setRooms(r=>[...r, {...room, id: Date.now().toString()}])
  }
  function updateRoom(id, patch){
    setRooms(r=>r.map(x=> x.id===id ? {...x, ...patch} : x))
  }
  function deleteRoom(id){
    setRooms(r=>r.filter(x=>x.id!==id))
  }

  // Exams CRUD
  function addExam(exam){
    setExams(e=>[...e, {...exam, id: Date.now().toString()}])
  }
  function updateExam(id, patch){
    setExams(e=>e.map(x=> x.id===id ? {...x, ...patch} : x))
  }
  function deleteExam(id){
    setExams(e=>e.filter(x=>x.id!==id))
  }

  // Staff CRUD
  function addStaff(staffMember){
    setStaff(s=>[...s, {...staffMember, id: Date.now().toString()}])
  }
  function updateStaff(id, patch){
    setStaff(s=>s.map(x=> x.id===id ? {...x, ...patch} : x))
  }
  function deleteStaff(id){
    setStaff(s=>s.filter(x=>x.id!==id))
  }

  const value = {
    students, addStudent, updateStudent, deleteStudent,
    rooms, addRoom, updateRoom, deleteRoom,
    exams, addExam, updateExam, deleteExam,
    staff, addStaff, updateStaff, deleteStaff
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(){ return useContext(DataContext) }

export default DataContext
