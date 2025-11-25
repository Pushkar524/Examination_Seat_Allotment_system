import React from 'react';
import VisualSeatSelection from './VisualSeatSelection';

const SeatAllotment = () => {
  // Directly show Visual Seat Selection (which now includes the allotment list)
  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <VisualSeatSelection />
      </div>
    </div>
  );
};

export default SeatAllotment;
