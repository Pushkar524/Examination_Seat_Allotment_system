import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import Toast from './Toast'

export default function SubjectForm({ open, onClose, onSuccess, editSubject = null }) {
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    department: '',
    exam_date: '',
    start_time: '',
    end_time: ''
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (editSubject) {
      setFormData({
        subject_code: editSubject.subject_code || '',
        subject_name: editSubject.subject_name || '',
        department: editSubject.department || '',
        exam_date: editSubject.exam_date || '',
        start_time: editSubject.start_time || '',
        end_time: editSubject.end_time || ''
      })
    } else {
      resetForm()
    }
  }, [editSubject, open])

  const resetForm = () => {
    setFormData({
      subject_code: '',
      subject_name: '',
      department: '',
      exam_date: '',
      start_time: '',
      end_time: ''
    })
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.subject_code || !formData.subject_name || !formData.department || !formData.exam_date) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      showToast('Start time must be before end time', 'error')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = editSubject 
        ? `http://localhost:3000/api/subjects/${editSubject.id}`
        : 'http://localhost:3000/api/subjects'
      
      const response = await fetch(url, {
        method: editSubject ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save subject')
      }

      showToast(editSubject ? 'Subject updated successfully' : 'Subject created successfully', 'success')
      setTimeout(() => {
        resetForm()
        onSuccess()
        onClose()
      }, 1500)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <>
      <Modal open={open} title={editSubject ? 'Edit Subject' : 'Create New Subject'} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subject_code"
                value={formData.subject_code}
                onChange={handleChange}
                disabled={editSubject} // Can't change code when editing
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                placeholder="e.g., CS101"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subject_name"
                value={formData.subject_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Data Structures"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g., Computer Science"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Exam Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="exam_date"
              value={formData.exam_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (editSubject ? 'Update Subject' : 'Create Subject')}
            </button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
