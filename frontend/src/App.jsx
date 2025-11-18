import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Exams from './pages/Exams'
import RegisterStudents from './pages/RegisterStudents'
import RegisterStaff from './pages/RegisterStaff'
import Rooms from './pages/Rooms'
import FinalAllotment from './pages/FinalAllotment'

export default function App(){
  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/*" element={<ProtectedApp/>} />
      </Routes>
    </div>
  )
}

function ProtectedApp(){
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <Header />
        <div className="mt-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route path="/exams" element={<Exams/>} />
            <Route path="/students" element={<RegisterStudents/>} />
            <Route path="/staff" element={<RegisterStaff/>} />
            <Route path="/rooms" element={<Rooms/>} />
            <Route path="/allotment" element={<FinalAllotment/>} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
