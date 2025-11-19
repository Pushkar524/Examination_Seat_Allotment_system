const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication APIs
export const authAPI = {
  adminLogin: async (email, password) => {
    const data = await apiCall('/auth/login/admin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  studentLogin: async (roll_no, date_of_birth) => {
    const data = await apiCall('/auth/login/student', {
      method: 'POST',
      body: JSON.stringify({ roll_no, date_of_birth }),
      skipAuth: true,
    });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('student', JSON.stringify(data.student));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('student');
  },
};

// Upload APIs
export const uploadAPI = {
  uploadStudents: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/upload/students/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return await response.json();
  },

  uploadRooms: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/upload/rooms/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return await response.json();
  },

  uploadInvigilators: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/upload/invigilators/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return await response.json();
  },

  getStudents: async () => {
    return await apiCall('/upload/students');
  },

  addStudent: async (studentData) => {
    return await apiCall('/upload/students/add', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  },

  getRooms: async () => {
    return await apiCall('/upload/rooms');
  },

  addRoom: async (roomData) => {
    return await apiCall('/upload/rooms/add', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },

  getInvigilators: async () => {
    return await apiCall('/upload/invigilators');
  },

  addInvigilator: async (invigilatorData) => {
    return await apiCall('/upload/invigilators/add', {
      method: 'POST',
      body: JSON.stringify(invigilatorData),
    });
  },

  assignInvigilator: async (invigilatorId, roomId) => {
    return await apiCall(`/upload/invigilators/${invigilatorId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ room_id: roomId }),
    });
  },
};

// Allotment APIs
export const allotmentAPI = {
  generateAllotment: async (roomIds = []) => {
    return await apiCall('/allotment/allot', {
      method: 'POST',
      body: JSON.stringify({ room_ids: roomIds }),
    });
  },

  createAllotment: async (student_id, room_id, seat_number) => {
    return await apiCall('/allotment/allotments', {
      method: 'POST',
      body: JSON.stringify({ student_id, room_id, seat_number }),
    });
  },

  triggerAllotment: async () => {
    return await apiCall('/allotment/allot', {
      method: 'POST',
    });
  },

  getAllotments: async () => {
    return await apiCall('/allotment/allotments');
  },

  getMySeat: async () => {
    return await apiCall('/allotment/my-seat');
  },

  updateAllotment: async (id, room_id, seat_number) => {
    return await apiCall(`/allotment/allotments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ room_id, seat_number }),
    });
  },

  deleteAllotment: async (id) => {
    return await apiCall(`/allotment/allotments/${id}`, {
      method: 'DELETE',
    });
  },

  getStatistics: async () => {
    return await apiCall('/allotment/statistics');
  },
};

// Export APIs
export const exportAPI = {
  exportExcel: async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/export/allotments/excel`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export Excel');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seat_allotments.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  exportPDF: async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/export/allotments/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seat_allotments.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  exportRoomPDF: async (roomId) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/export/allotments/pdf/room/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export room PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room_${roomId}_allotment.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

export default {
  authAPI,
  uploadAPI,
  allotmentAPI,
  exportAPI,
};
