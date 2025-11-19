import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

export default function Login(){
  const [role, setRole] = useState('admin') // 'admin' | 'student'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const { setRole: setAuthRole, setStudentId: setAuthStudentId } = useAuth()

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      if(role === 'admin') {
        const data = await authAPI.adminLogin(email, password)
        setAuthRole('admin')
        navigate('/dashboard')
      } else {
        // Convert date from input format (YYYY-MM-DD) to database format
        const formattedDob = dob // Already in YYYY-MM-DD format from date input
        const data = await authAPI.studentLogin(rollNo, formattedDob)
        setAuthRole('student')
        setAuthStudentId(data.student.id)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="w-[560px] bg-gray-200 dark:bg-gray-800 p-8 rounded shadow-xl">
        <div className="flex gap-4 mb-6 justify-center">
          <TabButton active={role==='admin'} onClick={()=>setRole('admin')} color="rose">ADMIN</TabButton>
          <TabButton active={role==='student'} onClick={()=>setRole('student')} color="cyan">STUDENT</TabButton>
        </div>

        <h2 className="text-3xl text-rose-400 dark:text-rose-300 text-center mb-6">
          {role === 'admin' ? 'Administrator Login' : 'Student Login'}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {role === 'admin' && (
            <>
              <div>
                <label className="block mb-2 dark:text-gray-200">Email</label>
                <input 
                  type="email"
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  placeholder="Enter Your Email" 
                  className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 dark:text-gray-200">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  placeholder="Enter Your Password" 
                  className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
              </div>
            </>
          )}

          {role === 'student' && (
            <>
              <div>
                <label className="block mb-2 dark:text-gray-200">Roll Number</label>
                <input 
                  value={rollNo} 
                  onChange={e=>setRollNo(e.target.value)} 
                  placeholder="Enter Roll Number" 
                  className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 dark:text-gray-200">Date of Birth</label>
                <input 
                  type="date" 
                  value={dob} 
                  onChange={e=>setDob(e.target.value)} 
                  placeholder="YYYY-MM-DD" 
                  className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button 
              type="submit" 
              className="btn-primary w-full py-3 mt-4"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TabButton({children, active, onClick, color='cyan'}){
  const base = 'px-6 py-2 rounded cursor-pointer font-medium transition-colors'
  const activeCls = active ? (color==='rose' ? 'bg-rose-300 dark:bg-rose-600 dark:text-white' : 'bg-cyan-200 dark:bg-cyan-600 dark:text-white') : 'bg-gray-300 dark:bg-gray-600 dark:text-gray-200'
  return (
    <div onClick={onClick} className={`${base} ${activeCls}`}>{children}</div>
  )
}
