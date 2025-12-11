import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadAPI, allotmentAPI, examsAPI, deptSubjectsAPI } from '../services/api';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SeatAllotment = () => {
  const { isAdmin } = useAuth();
  
  // Exam selection state
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDetails, setExamDetails] = useState(null);
  
  // Department-subject mapping state
  const [departments, setDepartments] = useState([]);
  const [examSubjects, setExamSubjects] = useState([]);
  const [mappings, setMappings] = useState({}); // { department: [subject_id1, subject_id2, ...] }
  const [step, setStep] = useState(1); // 1: Select Exam, 2: Map Subjects, 3: Allocate
  
  // Room selection state
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState('pattern1');
  
  // Allotment list state
  const [allotments, setAllotments] = useState([]);
  const [allotmentSearchTerm, setAllotmentSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'OK',
    cancelText: 'Cancel',
    type: 'warning'
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  const showConfirm = (title, message, onConfirm, type = 'warning', confirmText = 'OK', cancelText = 'Cancel') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      type
    });
  };

  const closeConfirm = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleConfirm = () => {
    const callback = confirmDialog.onConfirm;
    closeConfirm();
    if (callback) {
      callback();
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadInitialData();
    }
  }, [isAdmin]);

  async function loadInitialData() {
    try {
      setLoading(true);
      const [examsData, roomsData, departmentsData] = await Promise.all([
        examsAPI.getAllExams(),
        uploadAPI.getRooms(),
        deptSubjectsAPI.getDepartments()
      ]);
      setExams(Array.isArray(examsData) ? examsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      await loadAllotments();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showToast('Failed to load data: ' + error.message, 'error');
      setExams([]);
      setRooms([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllotments() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/allotment/allotments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load allotments');
      
      const data = await response.json();
      setAllotments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading allotments:', error);
      setAllotments([]);
    }
  }

  async function handleExamSelect(exam) {
    try {
      setLoading(true);
      setSelectedExam(exam);
      setExamDetails(exam);
      setExamSubjects(exam.subjects || []);
      
      // Load existing mappings
      const existingMappings = await deptSubjectsAPI.getDepartmentSubjects(exam.id);
      const mappingsObj = {};
      existingMappings.forEach(m => {
        if (!mappingsObj[m.department]) {
          mappingsObj[m.department] = [];
        }
        mappingsObj[m.department].push(m.subject_id);
      });
      setMappings(mappingsObj);
      setStep(2);
    } catch (error) {
      console.error('Failed to load exam details:', error);
      showToast('Failed to load exam details', 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleSubjectForDepartment(department, subjectId) {
    setMappings(prev => {
      const currentSubjects = prev[department] || [];
      const subjectIdInt = parseInt(subjectId);
      
      if (currentSubjects.includes(subjectIdInt)) {
        // Remove subject
        const updated = currentSubjects.filter(id => id !== subjectIdInt);
        if (updated.length === 0) {
          const { [department]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [department]: updated };
      } else {
        // Add subject
        return { ...prev, [department]: [...currentSubjects, subjectIdInt] };
      }
    });
  }

  async function handleSaveMappings() {
    if (Object.keys(mappings).length === 0) {
      showToast('Please map at least one department to a subject', 'warning');
      return;
    }

    // Validate no time conflicts for same department
    const deptSubjectTimes = {};
    Object.entries(mappings).forEach(([dept, subjectIds]) => {
      subjectIds.forEach(subjectId => {
        const subject = examSubjects.find(s => s.id === subjectId);
        if (subject) {
          if (!deptSubjectTimes[dept]) deptSubjectTimes[dept] = [];
          deptSubjectTimes[dept].push({
            subject: subject.subject_code,
            date: subject.exam_date,
            start: subject.start_time,
            end: subject.end_time
          });
        }
      });
    });

    // Check for conflicts
    for (const [dept, times] of Object.entries(deptSubjectTimes)) {
      for (let i = 0; i < times.length; i++) {
        for (let j = i + 1; j < times.length; j++) {
          if (times[i].date === times[j].date) {
            const overlap = (times[i].start < times[j].end && times[i].end > times[j].start);
            if (overlap) {
              showToast(`Time conflict in ${dept}: ${times[i].subject} and ${times[j].subject} overlap on ${times[i].date}`, 'error');
              return;
            }
          }
        }
      }
    }

    try {
      setLoading(true);
      const mappingsArray = [];
      Object.entries(mappings).forEach(([department, subjectIds]) => {
        subjectIds.forEach(subject_id => {
          mappingsArray.push({ department, subject_id });
        });
      });
      
      await deptSubjectsAPI.bulkUpdateDepartmentSubjects(selectedExam.id, mappingsArray);
      showToast('Subject mappings saved successfully!', 'success');
      setStep(3);
    } catch (error) {
      console.error('Failed to save mappings:', error);
      showToast('Failed to save mappings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleRoomToggle(roomId) {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  }

  function handleSelectAllRooms() {
    setSelectedRooms(rooms.map(r => r.id));
  }

  function handleDeselectAllRooms() {
    setSelectedRooms([]);
  }

  async function handlePerformAllotment() {
    if (!selectedExam) {
      showToast('Please select an exam', 'warning');
      return;
    }

    if (Object.keys(mappings).length === 0) {
      showToast('Please map departments to subjects first', 'warning');
      return;
    }

    const roomNames = selectedRooms.length > 0 
      ? rooms.filter(r => selectedRooms.includes(r.id)).map(r => r.room_no).join(', ')
      : 'All available rooms';

    const patternName = selectedPattern === 'pattern1' 
      ? 'Pattern 1 (Alternating Columns by Subject)'
      : 'Pattern 2 (Alternate/Mixed Departments)';

    const strictModeText = examDetails?.strict_mode ? 'STRICT (students with same subject will NOT sit adjacent)' : 'LENIENT (allows adjacent if needed)';

    showConfirm(
      'Confirm Seat Allotment',
      `Allocate seats for:\n\nExam: ${selectedExam.exam_name}\nDate: ${new Date(selectedExam.exam_date).toLocaleDateString()}\nTime: ${selectedExam.start_time || 'N/A'} - ${selectedExam.end_time || 'N/A'}\nMode: ${strictModeText}\nPattern: ${patternName}\nRooms: ${roomNames}\n\nThis will automatically assign all students based on department-subject mappings.`,
      async () => {
        try {
          setLoading(true);
          
          const result = await deptSubjectsAPI.performSeatAllotment(
            selectedExam.id, 
            selectedPattern, 
            selectedRooms.length > 0 ? selectedRooms : null
          );
          
          const successMessage = `Seat allotment completed successfully!\n\n` +
            `Students allocated: ${result.allocatedCount}/${result.totalStudents}\n` +
            `Pattern: ${patternName}\n` +
            `Rooms used: ${result.totalRooms}\n` +
            `Capacity utilization: ${result.utilizationPercentage}%`;
          
          showToast(successMessage, 'success');
          
          // Reload allotments
          await loadAllotments();
          
          // Reset
          setSelectedExam(null);
          setExamDetails(null);
          setMappings({});
          setSelectedRooms([]);
          setStep(1);
        } catch (error) {
          console.error('Allotment failed:', error);
          
          // Check if error has detailed information
          if (error.response?.data?.details) {
            const details = error.response.data.details;
            const errorMessage = `${error.response.data.error}\n\n` +
              `Total students: ${details.totalStudents}\n` +
              `Available seats: ${details.availableSeats}\n` +
              `Shortage: ${details.shortageOfSeats || details.studentsUnallocated} seats\n` +
              `Additional rooms needed: ${details.additionalRoomsNeeded}\n\n` +
              `${details.message}`;
            
            showToast(errorMessage, 'error');
          } else {
            showToast('Failed to perform allotment: ' + (error.response?.data?.error || error.message), 'error');
          }
        } finally {
          setLoading(false);
        }
      },
      'warning',
      'Allocate Seats',
      'Cancel'
    );
  }

  async function handleDeleteAllAllotments() {
    showConfirm(
      'Delete All Allotments',
      `Are you sure you want to delete ALL ${allotments.length} seat allotments? This action cannot be undone!`,
      () => {
        showConfirm(
          'Final Confirmation',
          'This will permanently delete all seat assignments. Are you absolutely sure?',
          async () => {
            try {
              setLoading(true);
              
              for (const allotment of allotments) {
                await allotmentAPI.deleteAllotment(allotment.id);
              }
              
              await loadAllotments();
              showToast('All seat allotments deleted successfully!', 'success');
            } catch (error) {
              console.error('Delete all failed:', error);
              showToast(error.message || 'Failed to delete all allotments', 'error');
            } finally {
              setLoading(false);
            }
          },
          'danger',
          'Delete',
          'Cancel'
        );
      },
      'danger',
      'Continue',
      'Cancel'
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          Access Denied: Admin privileges required
        </div>
      </div>
    );
  }

  // Filter allotments based on search and filters
  const filteredAllotments = allotments.filter(a => {
    const matchesSearch = !allotmentSearchTerm || 
      a.roll_no?.toLowerCase().includes(allotmentSearchTerm.toLowerCase()) ||
      a.student_name?.toLowerCase().includes(allotmentSearchTerm.toLowerCase());
    
    const matchesCourse = !courseFilter || a.department?.includes(courseFilter);
    const matchesRoom = !roomFilter || a.room_no?.includes(roomFilter);
    const matchesSubject = !subjectFilter || a.subject_code?.includes(subjectFilter);
    
    return matchesSearch && matchesCourse && matchesRoom && matchesSubject;
  });

  // Get unique values for filter dropdowns
  const uniqueCourses = [...new Set(allotments.map(a => a.department).filter(c => c))];
  const uniqueRooms = [...new Set(allotments.map(a => a.room_no).filter(r => r))];
  const uniqueSubjects = [...new Set(allotments.map(a => a.subject_code).filter(s => s))];

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
            🎯 Seat Allotment
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Select exam → Map departments to subjects → Choose pattern → Allocate seats
          </p>
        </div>

        {/* Step 1: Select Exam */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className={`${step === 1 ? 'bg-blue-500' : 'bg-gray-400'} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg`}>
              1
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Select Exam</h2>
          </div>

          {exams.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="mb-4">No exams found. Create an exam first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(exam => (
                <button
                  key={exam.id}
                  onClick={() => handleExamSelect(exam)}
                  disabled={step > 1 && selectedExam?.id !== exam.id}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedExam?.id === exam.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300 disabled:opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-lg text-gray-800 dark:text-white">
                          {exam.exam_name}
                        </p>
                        {exam.strict_mode && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded">
                            STRICT
                          </span>
                        )}
                        {!exam.strict_mode && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded">
                            LENIENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>📅 {new Date(exam.exam_date).toLocaleDateString()}</span>
                        {exam.start_time && exam.end_time && (
                          <>
                            <span>•</span>
                            <span>⏰ {exam.start_time} - {exam.end_time}</span>
                          </>
                        )}
                        {exam.subjects && exam.subjects.length > 0 && (
                          <>
                            <span>•</span>
                            <span>📚 {exam.subjects.length} subject(s)</span>
                          </>
                        )}
                      </div>
                    </div>
                    {selectedExam?.id === exam.id && (
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Map Departments to Subjects */}
        {selectedExam && step >= 2 && (
          <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
            <div className={`${step === 2 ? 'bg-blue-500' : step > 2 ? 'bg-green-500' : 'bg-gray-400'} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Map Departments to Subjects</h2>
            </div>

            {examSubjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No subjects found for this exam. Please add subjects to the exam first.</p>
              </div>
            ) : (
              <>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ <strong>Important:</strong> Assign subjects to each department. Make sure no department has two subjects with overlapping time slots.
                  </p>
                </div>

                <div className="space-y-4">
                  {departments.map(dept => (
                    <div key={dept} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="mb-3">
                        <label className="font-semibold text-lg text-gray-800 dark:text-white">{dept}</label>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          ({(mappings[dept] || []).length} subject{(mappings[dept] || []).length !== 1 ? 's' : ''} selected)
                        </span>
                      </div>
                      <div className="space-y-2 ml-4">
                        {examSubjects.map(subject => (
                          <label key={subject.id} className="flex items-start gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(mappings[dept] || []).includes(subject.id)}
                              onChange={() => toggleSubjectForDepartment(dept, subject.id)}
                              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 dark:text-white">
                                {subject.subject_code} - {subject.subject_name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {subject.exam_date} | {subject.start_time} - {subject.end_time}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {step === 2 && (
                  <button
                    onClick={handleSaveMappings}
                    disabled={loading || Object.keys(mappings).length === 0}
                    className="w-full mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Mappings & Continue'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Select Rooms and Pattern */}
        {selectedExam && step >= 3 && (
          <>
            {/* Room Selection */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Select Rooms (Optional)</h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Leave unselected to use all available rooms
              </p>

              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleSelectAllRooms}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Select All ({rooms.length})
                </button>
                <button
                  onClick={handleDeselectAllRooms}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Deselect All
                </button>
                <div className="ml-auto text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {selectedRooms.length > 0 ? `${selectedRooms.length} room(s) selected` : 'All rooms will be used'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.map(room => {
                  const isSelected = selectedRooms.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => handleRoomToggle(room.id)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-gray-800 dark:text-white">{room.room_no}</p>
                        {isSelected && (
                          <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Floor {room.floor} • Capacity: {room.capacity}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {room.number_of_benches}x{room.seats_per_bench} layout
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pattern Selection */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Select Allocation Pattern</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedPattern('pattern1')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedPattern === 'pattern1'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Pattern 1</h3>
                    {selectedPattern === 'pattern1' && (
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">✓</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Alternating Columns by Subject</strong>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Students are allocated column-wise (vertically). Each column has students from the same subject.
                    {examDetails?.strict_mode && ' Adjacent columns will have different subjects.'}
                  </p>
                </button>

                <button
                  onClick={() => setSelectedPattern('pattern2')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedPattern === 'pattern2'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Pattern 2</h3>
                    {selectedPattern === 'pattern2' && (
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">✓</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Alternate/Mixed Departments</strong>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Students from different departments are mixed alternately throughout the rooms.
                  </p>
                </button>
              </div>
            </div>

            {/* Allocate Button */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                  5
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Perform Allocation</h2>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">📋 Summary:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Exam:</span>
                    <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                      {selectedExam.exam_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                    <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                      {examDetails?.strict_mode ? 'STRICT' : 'LENIENT'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Pattern:</span>
                    <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                      {selectedPattern === 'pattern1' ? 'Pattern 1 (Column-wise)' : 'Pattern 2 (Mixed)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Departments:</span>
                    <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                      {Object.keys(mappings).length} mapped
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePerformAllotment}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-lg shadow-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <span className="text-xl">🎯</span>
                {loading ? 'Allocating...' : 'Allocate Seats Now'}
              </button>
            </div>
          </>
        )}

        {/* Allotment List Section */}
        {allotments.length > 0 && (
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  📋 All Seat Allotments ({allotments.length})
                </h2>
                {isAdmin && (
                  <button
                    onClick={handleDeleteAllAllotments}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>ðŸ—‘ï¸</span>
                    {loading ? 'Deleting...' : 'Delete All Allotments'}
                  </button>
                )}
              </div>

              {/* Search and Filter Bar */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <input 
                  value={allotmentSearchTerm} 
                  onChange={e => setAllotmentSearchTerm(e.target.value)} 
                  placeholder="ðŸ” Search by Student Name or Roll No" 
                  className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                <select 
                  value={courseFilter} 
                  onChange={e => setCourseFilter(e.target.value)} 
                  className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  value={roomFilter} 
                  onChange={e => setRoomFilter(e.target.value)} 
                  className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Rooms</option>
                  {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select 
                  value={subjectFilter} 
                  onChange={e => setSubjectFilter(e.target.value)} 
                  className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Subjects</option>
                  {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Allotment Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">#</th>
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">Student Name</th>
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">Roll No</th>
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">Department</th>
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">Subject</th>
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">Room No</th>
                      <th className="border dark:border-gray-600 px-4 py-2 text-left">Seat No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllotments.map((allotment, index) => (
                      <tr key={allotment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="border dark:border-gray-600 px-4 py-2">{index + 1}</td>
                        <td className="border dark:border-gray-600 px-4 py-2">{allotment.student_name}</td>
                        <td className="border dark:border-gray-600 px-4 py-2">{allotment.roll_no}</td>
                        <td className="border dark:border-gray-600 px-4 py-2">{allotment.department}</td>
                        <td className="border dark:border-gray-600 px-4 py-2">
                          {allotment.subject_code ? (
                            <div>
                              <div className="font-semibold">{allotment.subject_code}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{allotment.subject_name}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="border dark:border-gray-600 px-4 py-2">{allotment.room_no}</td>
                        <td className="border dark:border-gray-600 px-4 py-2">{allotment.seat_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAllotments.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No allotments found matching your filters
                </div>
              )}
            </div>
          </div>
        )}

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={closeToast} 
          />
        )}
        
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          type={confirmDialog.type}
        />
      </div>
    </div>
  );
};

export default SeatAllotment;
