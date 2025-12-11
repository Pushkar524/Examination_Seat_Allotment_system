import React, { useState, useEffect } from 'react'

export default function SubjectSelector({ value, onChange, error }) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/subjects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load subjects')
      }

      const data = await response.json()
      setSubjects(data.subjects || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2 dark:text-white">
        Select Subject <span className="text-red-500">*</span>
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className={`w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
          error ? 'border-red-500' : ''
        }`}
        disabled={loading}
      >
        <option value="">
          {loading ? 'Loading subjects...' : 'Select a subject'}
        </option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.subject_code} - {subject.subject_name} ({subject.department})
            {subject.exam_date && ` - ${new Date(subject.exam_date).toLocaleDateString()}`}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      {subjects.length === 0 && !loading && (
        <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
          No subjects found. Create a subject first.
        </p>
      )}
    </div>
  )
}
