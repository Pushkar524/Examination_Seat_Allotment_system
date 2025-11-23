import { useState, useEffect } from 'react';

const DiagnosticPage = () => {
  const [status, setStatus] = useState({
    backend: 'checking...',
    auth: 'checking...',
    students: 'checking...',
    rooms: 'checking...',
    invigilators: 'checking...'
  });

  useEffect(() => {
    checkBackend();
    checkAuth();
    checkData();
  }, []);

  const checkBackend = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        setStatus(prev => ({ ...prev, backend: '✅ Connected' }));
      } else {
        setStatus(prev => ({ ...prev, backend: '❌ Server error' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, backend: `❌ ${error.message}` }));
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setStatus(prev => ({ ...prev, auth: `✅ Logged in as ${JSON.parse(user).role}` }));
    } else {
      setStatus(prev => ({ ...prev, auth: '❌ Not logged in' }));
    }
  };

  const checkData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setStatus(prev => ({
        ...prev,
        students: '⚠️ Login required',
        rooms: '⚠️ Login required',
        invigilators: '⚠️ Login required'
      }));
      return;
    }

    // Check students
    try {
      const response = await fetch('http://localhost:3000/api/upload/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus(prev => ({ ...prev, students: `✅ ${data.length} students found` }));
    } catch (error) {
      setStatus(prev => ({ ...prev, students: `❌ ${error.message}` }));
    }

    // Check rooms
    try {
      const response = await fetch('http://localhost:3000/api/upload/rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus(prev => ({ ...prev, rooms: `✅ ${data.length} rooms found` }));
    } catch (error) {
      setStatus(prev => ({ ...prev, rooms: `❌ ${error.message}` }));
    }

    // Check invigilators
    try {
      const response = await fetch('http://localhost:3000/api/upload/invigilators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus(prev => ({ ...prev, invigilators: `✅ ${data.length} invigilators found` }));
    } catch (error) {
      setStatus(prev => ({ ...prev, invigilators: `❌ ${error.message}` }));
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">System Diagnostic</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Backend Server:</span>
              <span>{status.backend}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Authentication:</span>
              <span>{status.auth}</span>
            </div>
          </div>
        </div>

        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold mb-4">Data Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Students:</span>
              <span>{status.students}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Rooms:</span>
              <span>{status.rooms}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Invigilators:</span>
              <span>{status.invigilators}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Quick Fixes:</h3>
          <ul className="text-sm space-y-1">
            <li>• If backend shows error → Restart backend server</li>
            <li>• If auth shows not logged in → Go to /login</li>
            <li>• If data shows login required → Login again</li>
            <li>• Clear browser cache: Ctrl+Shift+Delete</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
