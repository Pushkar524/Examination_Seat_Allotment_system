import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RegisterStudents from './pages/RegisterStudents'
import RegisterStaff from './pages/RegisterStaff'
import Rooms from './pages/Rooms'
import SeatAllotment from './pages/SeatAllotment'
import InvigilatorAssignment from './pages/InvigilatorAssignment'
import AllotmentReports from './pages/AllotmentReports'
import DiagnosticPage from './pages/DiagnosticPage'

export default function App(){
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
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
      <div className="flex-1 p-8 dark:text-gray-100">
        <Header />
        <div className="mt-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route path="/students" element={<RegisterStudents/>} />
            <Route path="/staff" element={<RegisterStaff/>} />
            <Route path="/rooms" element={<Rooms/>} />
            <Route path="/allotment" element={<SeatAllotment/>} />
            <Route path="/allotment-reports" element={<AllotmentReports/>} />
            <Route path="/assign-invigilators" element={<InvigilatorAssignment/>} />
            <Route path="/diagnostic" element={<DiagnosticPage/>} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
