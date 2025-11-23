import React, { useState, useEffect } from 'react';
import { uploadAPI } from '../services/api';

const SmartAllotment = ({ embedded = false }) => {
  const [config, setConfig] = useState({
    segregate_by: 'department',
    students_per_bench: 2,
    pattern: 'criss-cross',
    room_ids: []
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await uploadAPI.get('/rooms');
      setRooms(response.data.filter(r => r.number_of_benches > 0));
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        ...config,
        room_ids: config.room_ids.length > 0 ? config.room_ids : undefined
      };

      const response = await fetch('http://localhost:3000/api/smart-allotment/smart-allot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Allotment failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (roomId) => {
    const selected = config.room_ids.includes(roomId);
    if (selected) {
      setConfig({
        ...config,
        room_ids: config.room_ids.filter(id => id !== roomId)
      });
    } else {
      setConfig({
        ...config,
        room_ids: [...config.room_ids, roomId]
      });
    }
  };

  const content = (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSubmit}>
            {/* Segregation Criteria */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Segregate Students By
              </label>
              <select
                value={config.segregate_by}
                onChange={(e) => setConfig({ ...config, segregate_by: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="department">Department</option>
                <option value="academic_year">Year of Joining</option>
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Students will be grouped based on this criteria to prevent cheating
              </p>
            </div>

            {/* Seating Pattern - Only show for 2 students per bench */}
            {config.students_per_bench === 2 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seating Pattern (2 Students/Bench)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, pattern: 'criss-cross' })}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      config.pattern === 'criss-cross'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      Pattern 1: Criss-Cross Zigzag
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Alternating zigzag with crossing lines
                    </div>
                    <div className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      Bench 1: [S1 S2]<br/>
                      Bench 2: [S2 S1]<br/>
                      Bench 3: [S1 S2]
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, pattern: 'linear' })}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      config.pattern === 'linear'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      Pattern 2: Sequential/Linear
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Fill one subject completely, then next
                    </div>
                    <div className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      Bench 1-3: [S1 S1]<br/>
                      Bench 4-6: [S2 S2]
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Info for 3 students per bench */}
            {config.students_per_bench === 3 && (
              <div className="mb-6">
                <div className="p-4 bg-purple-50 dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-700 rounded-lg">
                  <div className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                    📋 Pattern 3: Three-Subject Rotation (Auto-Applied)
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-300 mb-2">
                    Consistent rotation pattern across all benches
                  </div>
                  <div className="text-xs font-mono bg-white dark:bg-gray-800 p-3 rounded">
                    All Benches: [S1 S2 S3] [S1 S2 S3] [S1 S2 S3]
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-400 mt-2">
                    ✓ Best for 3 subjects examined simultaneously
                  </div>
                </div>
              </div>
            )}

            {/* Students per Bench */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Students per Bench
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, students_per_bench: 2 })}
                  className={`flex-1 py-3 px-6 border-2 rounded-lg font-medium transition ${
                    config.students_per_bench === 2
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  2 Students
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, students_per_bench: 3 })}
                  className={`flex-1 py-3 px-6 border-2 rounded-lg font-medium transition ${
                    config.students_per_bench === 3
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  3 Students
                </button>
              </div>
            </div>

            {/* Room Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Rooms (Optional)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
                {rooms.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No rooms with bench configuration available</p>
                ) : (
                  <div className="space-y-2">
                    {rooms.map(room => (
                      <label key={room.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.room_ids.includes(room.id)}
                          onChange={() => handleRoomSelect(room.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-900 dark:text-white">
                          {room.room_no} - Floor {room.floor} ({room.capacity} seats, {room.number_of_benches} benches)
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Leave empty to use all available rooms
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Allocating Seats...' : 'Start Smart Allotment'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-4">
              ✓ Allotment Completed Successfully
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Students:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{result.totalStudents}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Allotted Seats:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{result.allottedSeats}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Rooms Used:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{result.roomsUsed}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Pattern:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white capitalize">{result.pattern}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Students per Bench:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{result.studentsPerBench}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Segregated By:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white capitalize">{result.segregatedBy}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Invigilators Assigned:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{result.invigilatorsAssigned}</span>
              </div>
              {result.vacantRooms > 0 && (
                <div>
                  <span className="text-red-600 dark:text-red-400">⚠️ Vacant Rooms:</span>
                  <span className="ml-2 font-semibold text-red-700 dark:text-red-300">{result.vacantRooms}</span>
                </div>
              )}
            </div>
            {result.groups && result.groups.length > 0 && (
              <div className="mt-4">
                <span className="text-gray-600 dark:text-gray-400">Groups:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.groups.map((group, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-sm font-medium text-gray-900 dark:text-white">
                      {group}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.vacantRooms > 0 && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200 text-sm">
                  Warning: {result.vacantRooms} room(s) need invigilator assignment. Please view the Reports page for details.
                </p>
              </div>
            )}
          </div>
        )}
      </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Smart Seat Allotment
        </h1>
        {content}
      </div>
    </div>
  );
};

export default SmartAllotment;
