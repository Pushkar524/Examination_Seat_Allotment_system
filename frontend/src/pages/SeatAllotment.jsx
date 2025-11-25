import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualAllotment from './ManualAllotment';
import VisualSeatSelection from './VisualSeatSelection';

const SeatAllotment = () => {
  const [selectedMethod, setSelectedMethod] = useState(null); // null, 'visual', 'manual'
  const navigate = useNavigate();

  // If no method selected, show selection screen
  if (!selectedMethod) {
    return (
      <div className="p-6 dark:bg-gray-900 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Seat Allotment
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Choose your preferred method for seat allotment
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Select Method */}
            <button
              onClick={() => setSelectedMethod('visual')}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎫</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Visual Select
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Interactive seat selection with visual room layout
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 dark:text-purple-400 font-bold">✓</span>
                  <span>Visual room layout like movie theater booking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 dark:text-purple-400 font-bold">✓</span>
                  <span>Click to select seats and assign students</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 dark:text-purple-400 font-bold">✓</span>
                  <span>See occupied seats in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 dark:text-purple-400 font-bold">✓</span>
                  <span>Perfect for manual precise placement</span>
                </li>
              </ul>
              <div className="mt-6 text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                Select this method →
              </div>
            </button>

            {/* Manual Allotment Method */}
            <button
              onClick={() => setSelectedMethod('manual')}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-left border-2 border-transparent hover:border-amber-500 dark:hover:border-amber-400 group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Manual Allotment
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Full control over individual assignments
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 font-bold">✓</span>
                  <span>Add, edit, delete individual seats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 font-bold">✓</span>
                  <span>View and manage all allotments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 font-bold">✓</span>
                  <span>Export to Excel/PDF formats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 font-bold">✓</span>
                  <span>Real-time statistics tracking</span>
                </li>
              </ul>
              <div className="mt-6 text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                Select this method →
              </div>
            </button>
          </div>

          {/* Info section */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
              💡 Not sure which to choose?
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <p><strong>Visual Select:</strong> Best when you need precise control over specific seat placements with a visual interface.</p>
              <p><strong>Smart Allotment:</strong> Recommended for most cases - automatically handles large numbers of students with anti-cheating patterns.</p>
              <p><strong>Manual Allotment:</strong> Use when you need to make specific adjustments or manage allotments one by one.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show selected method with back button
  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => setSelectedMethod(null)}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to method selection</span>
        </button>

        {/* Render selected component */}
        {selectedMethod === 'visual' && <VisualSeatSelection />}
        {selectedMethod === 'manual' && <ManualAllotment embedded={true} />}
      </div>
    </div>
  );
};

export default SeatAllotment;
