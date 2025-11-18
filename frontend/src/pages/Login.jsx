import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const [role, setRole] = useState('admin') // 'admin' | 'student'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [studentId, setStudentId] = useState('')
  const navigate = useNavigate()

  const { setRole: setAuthRole, setStudentId: setAuthStudentId } = useAuth()

  function onSubmit(e){
    e.preventDefault()
    // Set selected role in global auth and navigate to dashboard
    setAuthRole(role)
    if(role === 'student' && studentId) {
      setAuthStudentId(studentId)
    }
    navigate('/dashboard')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-[560px] bg-gray-200 p-8 rounded shadow">
        <div className="flex gap-4 mb-6 justify-center">
          <TabButton active={role==='admin'} onClick={()=>setRole('admin')} color="rose">ADMIN</TabButton>
          <TabButton active={role==='student'} onClick={()=>setRole('student')} color="cyan">STUDENT</TabButton>
        </div>

        <h2 className="text-3xl text-rose-400 text-center mb-6">
          {role === 'admin' ? 'Administrator Login' : 'Student Login'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {role === 'admin' && (
            <>
              <div>
                <label className="block mb-2">Username</label>
                <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter Your Username" className="input" />
              </div>
              <div>
                <label className="block mb-2">Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter Your Password" className="input" />
              </div>
            </>
          )}

          {role === 'student' && (
            <>
              <div>
                <label className="block mb-2">Student ID</label>
                <input value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="Enter Student ID" className="input" />
              </div>
              <div>
                <label className="block mb-2">Date of Birth (for verification)</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter DOB or Password" className="input" />
              </div>
            </>
          )}

          <div className="text-sm text-gray-700">Forgot Passsword?</div>
          <div>
            <button type="submit" className="btn-primary w-full py-3 mt-4">Login</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TabButton({children, active, onClick, color='cyan'}){
  const base = 'px-6 py-2 rounded cursor-pointer font-medium'
  const activeCls = active ? (color==='rose' ? 'bg-rose-300' : 'bg-cyan-200') : 'bg-gray-300'
  return (
    <div onClick={onClick} className={`${base} ${activeCls}`}>{children}</div>
  )
}
