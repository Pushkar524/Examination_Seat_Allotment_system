import { useState, useEffect } from 'react';
import { allotmentAPI, exportAPI } from '../services/api';

const AllotmentReports = () => {
  const [allotments, setAllotments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllotments();
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
      alert(error.message || 'Failed to export');
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
      alert(error.message || 'Failed to export');
    } finally {
      setLoading(false);
    }
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
            📊 Allotment Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View seat allotments by department, room, or all allotments
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
            <div className="p-4 border-b dark:border-gray-700">
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
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{dept}</h3>
                      <span className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-blue-800 dark:text-blue-200 text-sm font-semibold">
                        {groupedByDepartment[dept].length} students
                      </span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(groupedByRoom).sort().map(room => (
                  <div key={room} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{room}</h3>
                      <span className="bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full text-purple-800 dark:text-purple-200 text-sm font-semibold">
                        {groupedByRoom[room].length}
                      </span>
                    </div>
                    <button
                      onClick={() => setRoomFilter(room)}
                      className="text-purple-600 dark:text-purple-400 hover:underline text-sm"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllotmentReports;
