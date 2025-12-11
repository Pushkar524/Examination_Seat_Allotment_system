import React, {useState} from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'

const MenuItem = ({to, children, collapsed}) => (
  <NavLink to={to} className={({isActive}) => `block px-6 py-3 my-2 rounded text-sm transition-colors ${isActive ? 'bg-cyan-200 dark:bg-cyan-700 dark:text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'} ${collapsed ? 'text-center' : ''}`}>
    {children}
  </NavLink>
)

export default function Sidebar(){
  const navigate = useNavigate()
  const { role, setRole, isAdmin, profilePic, setProfilePic, adminProfile, setAdminProfile } = useAuth()
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ username: '', password: '', email: '', phone: '' })
  const [collapsed, setCollapsed] = useState(false)

  function openProfileModal(){
    setProfileForm(adminProfile)
    setProfileModalOpen(true)
  }

  function saveProfile(e){
    e.preventDefault()
    setAdminProfile(profileForm)
    setProfileModalOpen(false)
  }

  function handleProfilePicChange(e){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = ()=> setProfilePic(reader.result)
    reader.readAsDataURL(f)
  }

  function logout(){
    setRole(null)
    navigate('/login')
  }

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-cyan-100 dark:bg-gray-800 min-h-screen p-6 flex flex-col transition-all duration-300 relative`}>
      <div>
        {/* Hamburger Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`${collapsed ? 'flex justify-center mb-8 p-2' : 'flex items-center gap-2 mb-8 px-3 py-2 bg-cyan-200 dark:bg-gray-700 rounded-lg shadow-lg'} hover:bg-cyan-300 dark:hover:bg-gray-600 transition-colors w-full`}
          aria-label="Toggle sidebar"
        >
          <div className="flex flex-col gap-1">
            <div className="w-5 h-0.5 bg-gray-700 dark:bg-white rounded"></div>
            <div className="w-5 h-0.5 bg-gray-700 dark:bg-white rounded"></div>
            <div className="w-5 h-0.5 bg-gray-700 dark:bg-white rounded"></div>
          </div>
          {!collapsed && <span className="text-sm font-medium dark:text-white text-gray-700">To collapse</span>}
        </button>
        
        <div>
          <MenuItem to="/dashboard" collapsed={collapsed}>{collapsed ? '📊' : '📊 DASHBOARD'}</MenuItem>
          {(isAdmin || role === 'admin') && (
            <>
              {!collapsed && <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 mt-4 mb-2">SEAT ALLOTMENT</div>}
              <MenuItem to="/seat-allotment" collapsed={collapsed}>{collapsed ? '🎯' : '🎯 SEAT ALLOTMENT'}</MenuItem>
              <MenuItem to="/allotment-reports" collapsed={collapsed}>{collapsed ? '📋' : '📋 REPORTS'}</MenuItem>
              
              {!collapsed && <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 mt-4 mb-2">MANAGEMENT</div>}
              <MenuItem to="/students" collapsed={collapsed}>{collapsed ? '👨‍🎓' : '👨‍🎓 STUDENTS'}</MenuItem>
              <MenuItem to="/staff" collapsed={collapsed}>{collapsed ? '👨‍🏫' : '👨‍🏫 INVIGILATORS'}</MenuItem>
              <MenuItem to="/rooms" collapsed={collapsed}>{collapsed ? '🏢' : '🏢 ROOMS'}</MenuItem>
              <MenuItem to="/exams" collapsed={collapsed}>{collapsed ? '📅' : '📅 EXAMS'}</MenuItem>
              <MenuItem to="/assign-invigilators" collapsed={collapsed}>{collapsed ? '📌' : '📌 ASSIGN STAFF'}</MenuItem>
            </>
          )}
        </div>
      </div>

      <div className="mt-auto">
        {role && !collapsed && (
          <div 
            onClick={isAdmin ? openProfileModal : undefined}
            className={`flex items-center gap-3 mb-4 p-3 rounded-lg dark:text-white ${isAdmin ? 'cursor-pointer hover:bg-cyan-200 dark:hover:bg-gray-700 transition-colors' : ''}`}
          >
            <div className="relative">
              {profilePic ? (
                <img src={profilePic} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-rose-300 flex items-center justify-center text-white font-bold text-lg">
                  {adminProfile.username?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{role.toUpperCase()}</div>
              {isAdmin && <div className="text-xs text-gray-600 dark:text-gray-400">Admin: full edit access</div>}
            </div>
            {isAdmin && (
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        )}

        {role && collapsed && (
          <div 
            onClick={isAdmin ? openProfileModal : undefined}
            className={`flex items-center justify-center mb-4 ${isAdmin ? 'cursor-pointer' : ''}`}
          >
            <div className="w-10 h-10 rounded-full bg-rose-300 flex items-center justify-center text-white font-bold text-lg shadow-lg hover:bg-rose-400 transition-colors">
              {adminProfile.username?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        )}

        {!collapsed && (
          <button onClick={logout} className="w-full bg-violet-200 dark:bg-violet-700 px-4 py-2 rounded hover:bg-violet-300 dark:hover:bg-violet-600 transition-colors dark:text-white">
            LOGOUT
          </button>
        )}

        {/* Admin Profile Modal */}
        <Modal open={profileModalOpen} title="Admin Profile Settings" onClose={()=>setProfileModalOpen(false)}>
          <form onSubmit={saveProfile} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-5 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <div className="w-2 h-2 bg-rose-500 rounded-full mr-3"></div>
                Profile Picture
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profilePic ? (
                    <img src={profilePic} alt="profile" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-rose-300 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                      {profileForm.username?.[0]?.toUpperCase() || 'A'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Photo</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProfilePicChange}
                    className="w-full text-sm"
                  />
                  {profilePic && (
                    <button 
                      type="button"
                      onClick={()=>setProfilePic(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-5 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></div>
                Account Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                  <input 
                    value={profileForm.username} 
                    onChange={e=>setProfileForm(s=>({...s, username: e.target.value}))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input 
                    type="password"
                    value={profileForm.password} 
                    onChange={e=>setProfileForm(s=>({...s, password: e.target.value}))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input 
                    type="email"
                    value={profileForm.email} 
                    onChange={e=>setProfileForm(s=>({...s, email: e.target.value}))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input 
                    type="tel"
                    value={profileForm.phone} 
                    onChange={e=>setProfileForm(s=>({...s, phone: e.target.value}))} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition duration-200" 
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                type="button"
                onClick={()=>setProfileModalOpen(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-105"
              >
                ✓ Save Changes
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </aside>
  )
}
