import React, { useState, useEffect } from 'react';
import { allotmentAPI, exportAPI, uploadAPI } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const AllotmentReports = () => {
  const [allotments, setAllotments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoomForGrid, setSelectedRoomForGrid] = useState(null);
  
  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toast and ConfirmDialog state
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null,
    type: 'warning'
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type });
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
    fetchAllotments();
    fetchRooms();
  }, []);

  const fetchAllotments = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching allotments...');
      const data = await allotmentAPI.getAllotments();
      console.log('Allotments data:', data);
      setAllotments(data || []);
    } catch (err) {
      console.error('Error fetching allotments:', err);
      setError(err.message || 'Failed to load allotments');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const data = await uploadAPI.getRooms();
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  // Filter allotments
  const filteredAllotments = (allotments || []).filter(a => {
    const matchesSearch = !searchTerm || 
      a.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !departmentFilter || a.department === departmentFilter;
    const matchesRoom = !roomFilter || a.room_no === roomFilter;
    
    return matchesSearch && matchesDepartment && matchesRoom;
  });

  // Get unique values for filters
  const uniqueDepartments = [...new Set((allotments || []).map(a => a.department).filter(d => d))];
  const uniqueRooms = [...new Set((allotments || []).map(a => a.room_no).filter(r => r))];

  // Group by department
  const groupedByDepartment = {};
  filteredAllotments.forEach(a => {
    const dept = a.department || 'Unknown';
    if (!groupedByDepartment[dept]) {
      groupedByDepartment[dept] = [];
    }
    groupedByDepartment[dept].push(a);
  });

  // Group by room
  const groupedByRoom = {};
  filteredAllotments.forEach(a => {
    const room = a.room_no || 'Unknown';
    if (!groupedByRoom[room]) {
      groupedByRoom[room] = [];
    }
    groupedByRoom[room].push(a);
  });

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setLoading(true);
      await exportAPI.exportExcel();
    } catch (error) {
      console.error('Export failed:', error);
      showToast(error.message || 'Failed to export', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      await exportAPI.exportPDF();
    } catch (error) {
      console.error('Export failed:', error);
      showToast(error.message || 'Failed to export', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export filtered data as CSV
  const exportFilteredCSV = () => {
    if (filteredAllotments.length === 0) {
      showToast('No data to export', 'info');
      return;
    }

    // Sort by roll number
    const sortedAllotments = [...filteredAllotments].sort((a, b) => 
      a.roll_no.localeCompare(b.roll_no)
    );

    const headers = ['Roll No', 'Student Name', 'Department', 'Room No', 'Floor', 'Seat No'];
    const rows = sortedAllotments.map(a => [
      a.roll_no,
      a.student_name,
      a.department,
      a.room_no,
      a.floor,
      a.seat_number
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const fileName = departmentFilter && roomFilter 
      ? `${departmentFilter}_${roomFilter}_allotments.csv`
      : departmentFilter 
        ? `${departmentFilter}_allotments.csv`
        : roomFilter
          ? `${roomFilter}_allotments.csv`
          : 'filtered_allotments.csv';
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Export department-wise CSV
  const exportDepartmentCSV = (dept) => {
    const deptAllotments = groupedByDepartment[dept];
    if (!deptAllotments || deptAllotments.length === 0) return;

    // Sort by roll number
    const sortedAllotments = [...deptAllotments].sort((a, b) => 
      a.roll_no.localeCompare(b.roll_no)
    );

    const headers = ['Roll No', 'Student Name', 'Department', 'Room No', 'Floor', 'Seat No'];
    const rows = sortedAllotments.map(a => [
      a.roll_no,
      a.student_name,
      a.department,
      a.room_no,
      a.floor,
      a.seat_number
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dept}_allotments.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Export room-wise CSV
  const exportRoomCSV = (room) => {
    const roomAllotments = groupedByRoom[room];
    if (!roomAllotments || roomAllotments.length === 0) return;

    // Sort by roll number
    const sortedAllotments = [...roomAllotments].sort((a, b) => 
      a.roll_no.localeCompare(b.roll_no)
    );

    const headers = ['Roll No', 'Student Name', 'Department', 'Room No', 'Floor', 'Seat No'];
    const rows = sortedAllotments.map(a => [
      a.roll_no,
      a.student_name,
      a.department,
      a.room_no,
      a.floor,
      a.seat_number
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${room}_allotments.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Export department-wise PDF
  const exportDepartmentPDF = (dept) => {
    const deptAllotments = groupedByDepartment[dept];
    if (!deptAllotments || deptAllotments.length === 0) return;

    // Sort by roll number
    const sortedAllotments = [...deptAllotments].sort((a, b) => 
      a.roll_no.localeCompare(b.roll_no)
    );

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Seat Allotment Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(dept, 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Total Students: ${deptAllotments.length}`, 105, 32, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 38, { align: 'center' });

    // Add table using autoTable
    autoTable(doc, {
      startY: 45,
      head: [['Roll No', 'Student Name', 'Department', 'Room No', 'Floor', 'Seat No']],
      body: sortedAllotments.map(a => [
        a.roll_no,
        a.student_name,
        a.department,
        a.room_no,
        a.floor,
        a.seat_number
      ]),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }, // Green color
      styles: { fontSize: 9 }
    });

    // Save the PDF
    doc.save(`${dept}_allotments.pdf`);
  };

  // Export room-wise PDF
  const exportRoomPDF = (room) => {
    const roomAllotments = groupedByRoom[room];
    if (!roomAllotments || roomAllotments.length === 0) return;

    // Sort by roll number
    const sortedAllotments = [...roomAllotments].sort((a, b) => 
      a.roll_no.localeCompare(b.roll_no)
    );

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Seat Allotment Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(room, 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Total Students: ${roomAllotments.length}`, 105, 32, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 38, { align: 'center' });

    // Add table using autoTable
    autoTable(doc, {
      startY: 45,
      head: [['Roll No', 'Student Name', 'Department', 'Room No', 'Floor', 'Seat No']],
      body: sortedAllotments.map(a => [
        a.roll_no,
        a.student_name,
        a.department,
        a.room_no,
        a.floor,
        a.seat_number
      ]),
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234] }, // Purple color
      styles: { fontSize: 9 }
    });

    // Save the PDF
    doc.save(`${room}_allotments.pdf`);
  };

  // Render room grid view
  const RoomGridView = ({ room }) => {
    const roomData = rooms.find(r => r.room_no === room);
    if (!roomData) return null;

    const roomAllotments = allotments.filter(a => a.room_no === room);
    const occupiedSeats = new Set(roomAllotments.map(a => a.seat_number));

    const numBenches = roomData.number_of_benches || 10;
    const seatsPerBench = roomData.seats_per_bench || 4;

    // Create benches with seats - column-wise numbering
    const benches = [];
    for (let benchIndex = 0; benchIndex < numBenches; benchIndex++) {
      const benchSeats = [];
      for (let seatIndex = 0; seatIndex < seatsPerBench; seatIndex++) {
        const seatNum = seatIndex * numBenches + benchIndex + 1;
        if (seatNum <= roomData.capacity) {
          benchSeats.push(seatNum);
        }
      }
      benches.push(benchSeats);
    }

    // Get unique departments and assign colors
    const uniqueDepts = [...new Set(roomAllotments.map(a => a.department))];
    const deptColors = {
      // Light pastel colors for different departments
      0: { bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-400', text: 'text-blue-900 dark:text-blue-100' },
      1: { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-400', text: 'text-green-900 dark:text-green-100' },
      2: { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-400', text: 'text-purple-900 dark:text-purple-100' },
      3: { bg: 'bg-pink-100 dark:bg-pink-900', border: 'border-pink-400', text: 'text-pink-900 dark:text-pink-100' },
      4: { bg: 'bg-yellow-100 dark:bg-yellow-900', border: 'border-yellow-400', text: 'text-yellow-900 dark:text-yellow-100' },
      5: { bg: 'bg-cyan-100 dark:bg-cyan-900', border: 'border-cyan-400', text: 'text-cyan-900 dark:text-cyan-100' },
      6: { bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-400', text: 'text-orange-900 dark:text-orange-100' },
      7: { bg: 'bg-teal-100 dark:bg-teal-900', border: 'border-teal-400', text: 'text-teal-900 dark:text-teal-100' },
      8: { bg: 'bg-indigo-100 dark:bg-indigo-900', border: 'border-indigo-400', text: 'text-indigo-900 dark:text-indigo-100' },
      9: { bg: 'bg-rose-100 dark:bg-rose-900', border: 'border-rose-400', text: 'text-rose-900 dark:text-rose-100' },
    };

    const getDeptColor = (department) => {
      const index = uniqueDepts.indexOf(department);
      return deptColors[index % 10] || deptColors[0];
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {room} - Seat Grid
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {numBenches} Benches × {seatsPerBench} Seats | Capacity: {roomData.capacity} | Occupied: {roomAllotments.length} | Available: {roomData.capacity - roomAllotments.length}
            </p>
          </div>
          <button
            onClick={() => setSelectedRoomForGrid(null)}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            ✕ Close
          </button>
        </div>

        {/* Legend */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Departments:</div>
          <div className="flex flex-wrap gap-3">
            {uniqueDepts.map(dept => {
              const colors = getDeptColor(dept);
              return (
                <div key={dept} className="flex items-center gap-2">
                  <div className={`w-8 h-8 ${colors.bg} rounded border-2 ${colors.border}`}></div>
                  <span className="text-sm dark:text-gray-300">{dept}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded border-2 border-gray-400 dark:border-gray-600"></div>
              <span className="text-sm dark:text-gray-300">Empty</span>
            </div>
          </div>
        </div>

        {/* Grid - Benches Layout */}
        <div className="space-y-3">
          {benches.map((benchSeats, benchIndex) => (
            <div key={benchIndex} className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">
                Bench {benchIndex + 1}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${seatsPerBench}, minmax(0, 1fr))` }}>
                {benchSeats.map(seatNum => {
                  const allotment = roomAllotments.find(a => a.seat_number === seatNum);
                  const isOccupied = occupiedSeats.has(seatNum);
                  const colors = isOccupied ? getDeptColor(allotment.department) : null;

                  return (
                    <div
                      key={seatNum}
                      className={`relative p-2 flex flex-col items-center justify-center rounded border-2 transition-all min-h-[80px] ${
                        isOccupied
                          ? `${colors.bg} ${colors.border} shadow-md`
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600'
                      }`}
                      title={isOccupied ? `${allotment.student_name} (${allotment.roll_no}) - ${allotment.department}` : `Seat ${seatNum} - Empty`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${isOccupied ? colors.text : ''}`}>{seatNum}</span>
                        {isOccupied && (
                          <div className={`text-left text-xs ${colors.text}`}>
                            <div className="font-bold">{allotment.roll_no}</div>
                            <div className="text-[10px]">{allotment.student_name?.substring(0, 20)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-gray-900 p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4">Error Loading Reports</h2>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchAllotments}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!allotments || allotments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 max-w-md text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">No Allotments Found</h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            No seat allotments have been created yet. Please create allotments first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📊 Allotment Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View comprehensive seat allotments by department or room with export options
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Allotments</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">{allotments.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Departments</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-300">{uniqueDepartments.length}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Rooms Used</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-300">{uniqueRooms.length}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Filtered Results</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-300">{filteredAllotments.length}</div>
          </div>
        </div>

        {/* Filters and Export */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by name or roll no"
              className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Rooms</option>
              {uniqueRooms.map(room => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('');
                setRoomFilter('');
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-4 py-2 transition"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <span>📊</span> Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <span>📄</span> Export PDF
            </button>
            <button
              onClick={fetchAllotments}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {/* View Tabs */}
        {(departmentFilter || roomFilter) ? (
          // Filtered view - single table
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {departmentFilter && roomFilter 
                    ? `${departmentFilter} - ${roomFilter}`
                    : departmentFilter 
                      ? `Department: ${departmentFilter}`
                      : `Room: ${roomFilter}`}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {filteredAllotments.length} student(s)
                </p>
              </div>
              <button
                onClick={exportFilteredCSV}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <span>📥</span> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Roll No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Department</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Room No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Floor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Seat No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAllotments.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 font-mono">{a.roll_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">{a.student_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{a.department}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-cyan-100 dark:bg-cyan-900 px-2 py-1 rounded text-cyan-800 dark:text-cyan-200 font-semibold">
                          {a.room_no}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{a.floor}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded text-purple-800 dark:text-purple-200 font-semibold">
                          {a.seat_number}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Default view - grouped by department and room
          <div className="space-y-6">
            {/* Department-wise View */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                📚 Department-wise Allotments
              </h2>
              <div className="space-y-4">
                {Object.keys(groupedByDepartment).sort().map(dept => (
                  <div key={dept} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{dept}</h3>
                        <span className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-blue-800 dark:text-blue-200 text-sm font-semibold">
                          {groupedByDepartment[dept].length} students
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportDepartmentCSV(dept);
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1"
                          title="Export to CSV"
                        >
                          <span>📥</span> CSV
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportDepartmentPDF(dept);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1"
                          title="Export to PDF"
                        >
                          <span>📄</span> PDF
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setDepartmentFilter(dept)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Room-wise View */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                🏢 Room-wise Allotments
              </h2>
              
              {/* Grid View Modal */}
              {selectedRoomForGrid && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <RoomGridView room={selectedRoomForGrid} />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(groupedByRoom).sort().map(room => (
                  <div key={room} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{room}</h3>
                      <span className="bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full text-purple-800 dark:text-purple-200 text-sm font-semibold">
                        {groupedByRoom[room].length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedRoomForGrid(room)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition flex items-center justify-center gap-2"
                      >
                        <span>🔲</span> View Grid
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRoomFilter(room)}
                          className="flex-1 text-purple-600 dark:text-purple-400 hover:underline text-sm text-left"
                        >
                          View Details →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportRoomCSV(room);
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition"
                          title="Export to CSV"
                        >
                          📥
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportRoomPDF(room);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition"
                          title="Export to PDF"
                        >
                          📄
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Room Grid Modal */}
        {selectedRoomForGrid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-[90vh] overflow-auto">
              <RoomGridView room={selectedRoomForGrid} />
            </div>
          </div>
        )}
      </div>
      
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
        type={confirmDialog.type}
      />
    </div>
  );
};

export default AllotmentReports;
