import React, { useState } from 'react';
import ManualAllotment from './ManualAllotment';
import SmartAllotment from './SmartAllotment';

const SeatAllotment = () => {
  const [activeTab, setActiveTab] = useState('smart'); // 'smart' or 'manual'

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Seat Allotment
        </h1>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('smart')}
                className={`px-8 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'smart'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🧠</span>
                  <span>Smart Allotment</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-8 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Manual Allotment</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'smart' ? (
              <div>
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    ✨ Smart Allotment Features
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• Pattern-based seating (Criss-cross/Linear) to prevent cheating</li>
                    <li>• Automatic segregation by department or year</li>
                    <li>• Configurable students per bench (2 or 3)</li>
                    <li>• Automatic invigilator assignment</li>
                    <li>• Vacancy warnings for rooms without invigilators</li>
                  </ul>
                </div>
                <SmartAllotment embedded={true} />
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                    ⚙️ Manual Allotment Features
                  </h3>
                  <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                    <li>• Full control over seat assignments</li>
                    <li>• Add, edit, and delete individual allotments</li>
                    <li>• View and manage all existing allotments</li>
                    <li>• Export allotments to Excel/PDF</li>
                    <li>• Real-time statistics and progress tracking</li>
                  </ul>
                </div>
                <ManualAllotment embedded={true} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatAllotment;
