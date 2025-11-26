import React, { useState } from 'react'

/**
 * SeatGrid Component
 * Visual grid display of seats in a room (like bus seat booking)
 * Allows selection of multiple seats for student assignment
 * 
 * Props:
 * - room: Room object with number_of_benches and seats_per_bench
 * - occupiedSeats: Array of seat numbers that are already taken
 * - selectedSeats: Array of currently selected seat numbers
 * - onSeatSelect: Callback when seats are selected/deselected
 * - readOnly: If true, seats cannot be selected (view only mode)
 */
export default function SeatGrid({ 
  room, 
  occupiedSeats = [], 
  selectedSeats = [], 
  onSeatSelect,
  readOnly = false 
}) {
  const benches = room?.number_of_benches || 0
  const seatsPerBench = room?.seats_per_bench || 0

  if (!benches || !seatsPerBench) {
    return (
      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          No seating layout configured for this room
        </p>
      </div>
    )
  }

  // Calculate seat number based on bench (row) and position
  // Vertical numbering: seats are numbered column by column (top to bottom, then next column)
  const getSeatNumber = (benchIndex, seatIndex) => {
    return seatIndex * benches + benchIndex + 1
  }

  // Check if a seat is occupied
  const isSeatOccupied = (seatNumber) => {
    return occupiedSeats.includes(seatNumber)
  }

  // Check if a seat is selected
  const isSeatSelected = (seatNumber) => {
    return selectedSeats.includes(seatNumber)
  }

  // Handle seat click
  const handleSeatClick = (seatNumber) => {
    if (readOnly || isSeatOccupied(seatNumber)) return

    if (onSeatSelect) {
      onSeatSelect(seatNumber)
    }
  }

  // Select all available seats in a specific row
  const handleSelectRow = (benchIndex) => {
    if (readOnly) return
    
    const rowSeats = []
    for (let i = 0; i < seatsPerBench; i++) {
      const seatNumber = getSeatNumber(benchIndex, i)
      if (!isSeatOccupied(seatNumber)) {
        rowSeats.push(seatNumber)
      }
    }
    
    if (onSeatSelect && rowSeats.length > 0) {
      // Toggle: if all seats in row are selected, deselect them; otherwise select all
      const allSelected = rowSeats.every(seat => isSeatSelected(seat))
      rowSeats.forEach(seat => {
        if (allSelected) {
          // Deselect if all are selected
          if (isSeatSelected(seat)) {
            onSeatSelect(seat)
          }
        } else {
          // Select if not already selected
          if (!isSeatSelected(seat)) {
            onSeatSelect(seat)
          }
        }
      })
    }
  }

  // Select all available seats in a specific column
  const handleSelectColumn = (columnIndex) => {
    if (readOnly) return
    
    const columnSeats = []
    for (let i = 0; i < benches; i++) {
      const seatNumber = getSeatNumber(i, columnIndex)
      if (!isSeatOccupied(seatNumber)) {
        columnSeats.push(seatNumber)
      }
    }
    
    if (onSeatSelect && columnSeats.length > 0) {
      // Toggle: if all seats in column are selected, deselect them; otherwise select all
      const allSelected = columnSeats.every(seat => isSeatSelected(seat))
      columnSeats.forEach(seat => {
        if (allSelected) {
          if (isSeatSelected(seat)) {
            onSeatSelect(seat)
          }
        } else {
          if (!isSeatSelected(seat)) {
            onSeatSelect(seat)
          }
        }
      })
    }
  }

  // Select all available seats
  const handleSelectAll = () => {
    if (readOnly) return
    
    const allAvailableSeats = []
    for (let i = 0; i < benches; i++) {
      for (let j = 0; j < seatsPerBench; j++) {
        const seatNumber = getSeatNumber(i, j)
        if (!isSeatOccupied(seatNumber) && !isSeatSelected(seatNumber)) {
          allAvailableSeats.push(seatNumber)
        }
      }
    }
    
    if (onSeatSelect && allAvailableSeats.length > 0) {
      allAvailableSeats.forEach(seat => onSeatSelect(seat))
    }
  }

  // Deselect all selected seats
  const handleDeselectAll = () => {
    if (readOnly) return
    
    if (onSeatSelect && selectedSeats.length > 0) {
      selectedSeats.forEach(seat => {
        if (!isSeatOccupied(seat)) {
          onSeatSelect(seat)
        }
      })
    }
  }

  // Pattern 1: Select alternate columns only (1, 3, 5, etc.)
  const handleSelectAlternateColumns = () => {
    if (readOnly) return
    
    // Check which pattern is currently selected
    // Pattern A: columns 0, 2, 4, ... (columns 1, 3, 5, ... in display)
    // Pattern B: columns 1, 3, 5, ... (columns 2, 4, 6, ... in display)
    
    const patternASeats = []
    const patternBSeats = []
    
    for (let benchIndex = 0; benchIndex < benches; benchIndex++) {
      for (let seatIndex = 0; seatIndex < seatsPerBench; seatIndex += 2) {
        const seatNumber = getSeatNumber(benchIndex, seatIndex)
        if (!isSeatOccupied(seatNumber)) {
          patternASeats.push(seatNumber)
        }
      }
      for (let seatIndex = 1; seatIndex < seatsPerBench; seatIndex += 2) {
        const seatNumber = getSeatNumber(benchIndex, seatIndex)
        if (!isSeatOccupied(seatNumber)) {
          patternBSeats.push(seatNumber)
        }
      }
    }
    
    // Check if Pattern A is currently selected
    const patternASelected = patternASeats.length > 0 && 
                              patternASeats.every(seat => selectedSeats.includes(seat)) &&
                              patternBSeats.every(seat => !selectedSeats.includes(seat))
    
    // Check if Pattern B is currently selected
    const patternBSelected = patternBSeats.length > 0 && 
                              patternBSeats.every(seat => selectedSeats.includes(seat)) &&
                              patternASeats.every(seat => !selectedSeats.includes(seat))
    
    // First deselect all
    if (selectedSeats.length > 0) {
      selectedSeats.forEach(seat => {
        if (!isSeatOccupied(seat)) {
          onSeatSelect(seat)
        }
      })
    }
    
    // Then select the appropriate pattern
    if (onSeatSelect) {
      if (patternASelected) {
        // If Pattern A was selected, now select Pattern B
        patternBSeats.forEach(seat => onSeatSelect(seat))
      } else {
        // Default: select Pattern A (or if Pattern B was selected, cycle back to Pattern A)
        patternASeats.forEach(seat => onSeatSelect(seat))
      }
    }
  }

  // Pattern 2: Select alternate rows only (A, C, E, etc.)
  const handleSelectAlternateRows = () => {
    if (readOnly) return
    
    // Check which pattern is currently selected
    // Pattern A: rows 0, 2, 4, ... (rows A, C, E, ... in display)
    // Pattern B: rows 1, 3, 5, ... (rows B, D, F, ... in display)
    
    const patternASeats = []
    const patternBSeats = []
    
    for (let benchIndex = 0; benchIndex < benches; benchIndex += 2) {
      for (let seatIndex = 0; seatIndex < seatsPerBench; seatIndex++) {
        const seatNumber = getSeatNumber(benchIndex, seatIndex)
        if (!isSeatOccupied(seatNumber)) {
          patternASeats.push(seatNumber)
        }
      }
    }
    
    for (let benchIndex = 1; benchIndex < benches; benchIndex += 2) {
      for (let seatIndex = 0; seatIndex < seatsPerBench; seatIndex++) {
        const seatNumber = getSeatNumber(benchIndex, seatIndex)
        if (!isSeatOccupied(seatNumber)) {
          patternBSeats.push(seatNumber)
        }
      }
    }
    
    // Check if Pattern A is currently selected
    const patternASelected = patternASeats.length > 0 && 
                              patternASeats.every(seat => selectedSeats.includes(seat)) &&
                              patternBSeats.every(seat => !selectedSeats.includes(seat))
    
    // Check if Pattern B is currently selected
    const patternBSelected = patternBSeats.length > 0 && 
                              patternBSeats.every(seat => selectedSeats.includes(seat)) &&
                              patternASeats.every(seat => !selectedSeats.includes(seat))
    
    // First deselect all
    if (selectedSeats.length > 0) {
      selectedSeats.forEach(seat => {
        if (!isSeatOccupied(seat)) {
          onSeatSelect(seat)
        }
      })
    }
    
    // Then select the appropriate pattern
    if (onSeatSelect) {
      if (patternASelected) {
        // If Pattern A was selected, now select Pattern B
        patternBSeats.forEach(seat => onSeatSelect(seat))
      } else {
        // Default: select Pattern A (or if Pattern B was selected, cycle back to Pattern A)
        patternASeats.forEach(seat => onSeatSelect(seat))
      }
    }
  }

  // Pattern 3: Select alternate from both row and column (checkerboard pattern)
  const handleSelectCheckerboard = () => {
    if (readOnly) return
    
    // Check which pattern is currently selected
    // Pattern A: seats where (row + column) is even
    // Pattern B: seats where (row + column) is odd
    
    const patternASeats = []
    const patternBSeats = []
    
    for (let benchIndex = 0; benchIndex < benches; benchIndex++) {
      for (let seatIndex = 0; seatIndex < seatsPerBench; seatIndex++) {
        const seatNumber = getSeatNumber(benchIndex, seatIndex)
        if (!isSeatOccupied(seatNumber)) {
          if ((benchIndex + seatIndex) % 2 === 0) {
            patternASeats.push(seatNumber)
          } else {
            patternBSeats.push(seatNumber)
          }
        }
      }
    }
    
    // Check if Pattern A is currently selected
    const patternASelected = patternASeats.length > 0 && 
                              patternASeats.every(seat => selectedSeats.includes(seat)) &&
                              patternBSeats.every(seat => !selectedSeats.includes(seat))
    
    // Check if Pattern B is currently selected
    const patternBSelected = patternBSeats.length > 0 && 
                              patternBSeats.every(seat => selectedSeats.includes(seat)) &&
                              patternASeats.every(seat => !selectedSeats.includes(seat))
    
    // First deselect all
    if (selectedSeats.length > 0) {
      selectedSeats.forEach(seat => {
        if (!isSeatOccupied(seat)) {
          onSeatSelect(seat)
        }
      })
    }
    
    // Then select the appropriate pattern
    if (onSeatSelect) {
      if (patternASelected) {
        // If Pattern A was selected, now select Pattern B
        patternBSeats.forEach(seat => onSeatSelect(seat))
      } else {
        // Default: select Pattern A (or if Pattern B was selected, cycle back to Pattern A)
        patternASeats.forEach(seat => onSeatSelect(seat))
      }
    }
  }

  // Get seat CSS classes based on state
  const getSeatClasses = (seatNumber) => {
    const baseClasses = "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-semibold transition-all cursor-pointer border-2"
    
    if (isSeatOccupied(seatNumber)) {
      return `${baseClasses} bg-green-500 text-white border-green-600 cursor-not-allowed`
    }
    
    if (isSeatSelected(seatNumber)) {
      return `${baseClasses} bg-blue-500 text-white border-blue-600 hover:bg-blue-600`
    }
    
    return `${baseClasses} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600`
  }

  // Generate bench label (A, B, C, etc.)
  const getBenchLabel = (benchIndex) => {
    return String.fromCharCode(65 + benchIndex) // A=65 in ASCII
  }

  return (
    <div className="space-y-6">
      {/* Legend and Quick Actions */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-4 justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 border-2 border-blue-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 border-2 border-green-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Occupied</span>
          </div>
        </div>

        {!readOnly && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Select All Available
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Deselect All
              </button>
            </div>
            
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-200 mb-2 text-center">📐 Selection Patterns</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={handleSelectAlternateColumns}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  title="Select alternate columns (1, 3, 5, ...)"
                >
                  Pattern 1: Alt. Columns
                </button>
                <button
                  onClick={handleSelectAlternateRows}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  title="Select alternate rows (A, C, E, ...)"
                >
                  Pattern 2: Alt. Rows
                </button>
                <button
                  onClick={handleSelectCheckerboard}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  title="Select checkerboard pattern"
                >
                  Pattern 3: Checkerboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seat Grid */}
      <div className="space-y-3">
        {/* Column Headers with Select Column Buttons */}
        {!readOnly && (
          <div className="flex items-center gap-2 ml-10">
            {Array.from({ length: seatsPerBench }).map((_, columnIndex) => (
              <button
                key={columnIndex}
                onClick={() => handleSelectColumn(columnIndex)}
                className="w-12 h-6 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                title={`Select/Deselect column ${columnIndex + 1}`}
              >
                ↓ {columnIndex + 1}
              </button>
            ))}
          </div>
        )}

        {/* Seat Rows */}
        {Array.from({ length: benches }).map((_, benchIndex) => (
          <div key={benchIndex} className="flex items-center gap-2">
            {/* Bench Label with Select Row Button */}
            <div className="flex items-center gap-1">
              <div className="w-8 h-12 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400">
                {getBenchLabel(benchIndex)}
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleSelectRow(benchIndex)}
                  className="w-6 h-12 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                  title={`Select/Deselect row ${getBenchLabel(benchIndex)}`}
                >
                  →
                </button>
              )}
            </div>

            {/* Seats in this bench */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: seatsPerBench }).map((_, seatIndex) => {
                const seatNumber = getSeatNumber(benchIndex, seatIndex)
                return (
                  <button
                    key={seatNumber}
                    onClick={() => handleSeatClick(seatNumber)}
                    disabled={readOnly || isSeatOccupied(seatNumber)}
                    className={getSeatClasses(seatNumber)}
                    title={`Seat ${seatNumber}${isSeatOccupied(seatNumber) ? ' (Occupied)' : ''}`}
                  >
                    {seatNumber}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      {!readOnly && selectedSeats.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Selected Seats: {selectedSeats.length}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {selectedSeats.sort((a, b) => a - b).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
