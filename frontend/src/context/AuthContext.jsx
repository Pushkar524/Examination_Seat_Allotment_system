import React, {createContext, useContext, useState, useEffect} from 'react'

const AuthContext = createContext(null)

export function AuthProvider({children}){
  const [role, setRole] = useState(() => {
    try{
      return localStorage.getItem('role') || null
    }catch(e){ return null }
  })

  const [studentId, setStudentId] = useState(() => {
    try{
      return localStorage.getItem('studentId') || null
    }catch(e){ return null }
  })

  const [profilePic, setProfilePic] = useState(() => {
    try{ return localStorage.getItem('profilePic') || null }catch(e){ return null }
  })

  const [adminProfile, setAdminProfile] = useState(() => {
    try{
      const saved = localStorage.getItem('adminProfile')
      return saved ? JSON.parse(saved) : { username: 'admin', password: 'admin123', email: '', phone: '' }
    }catch(e){ return { username: 'admin', password: 'admin123', email: '', phone: '' } }
  })

  useEffect(() => {
    try{ if(role) localStorage.setItem('role', role); else localStorage.removeItem('role') }catch(e){}
  }, [role])

  useEffect(() => {
    try{ if(studentId) localStorage.setItem('studentId', studentId); else localStorage.removeItem('studentId') }catch(e){}
  }, [studentId])

  useEffect(() => {
    try{ if(profilePic) localStorage.setItem('profilePic', profilePic); else localStorage.removeItem('profilePic') }catch(e){}
  }, [profilePic])

  useEffect(() => {
    try{ localStorage.setItem('adminProfile', JSON.stringify(adminProfile)) }catch(e){}
  }, [adminProfile])

  const value = {
    role,
    setRole,
    studentId,
    setStudentId,
    isAdmin: role === 'admin',
    profilePic,
    setProfilePic,
    adminProfile,
    setAdminProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(){
  return useContext(AuthContext)
}

export default AuthContext
