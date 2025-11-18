const express = require('express');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');

const router = express.Router();

// Export seat allotments as Excel
router.get('/allotments/excel', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.name as student_name,
        s.roll_no,
        s.department,
        r.room_no,
        r.floor,
        sa.seat_number
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      ORDER BY r.room_no, sa.seat_number
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No seat allotments found' });
    }

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(result.rows);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // student_name
      { wch: 15 }, // roll_no
      { wch: 20 }, // department
      { wch: 12 }, // room_no
      { wch: 10 }, // floor
      { wch: 12 }  // seat_number
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Seat Allotments');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    res.setHeader('Content-Disposition', 'attachment; filename=seat_allotments.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export as Excel' });
  }
});

// Export seat allotments as PDF
router.get('/allotments/pdf', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.name as student_name,
        s.roll_no,
        s.department,
        r.room_no,
        r.floor,
        sa.seat_number
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      ORDER BY r.room_no, sa.seat_number
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No seat allotments found' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=seat_allotments.pdf');

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Examination Seat Allotment', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table configuration
    const tableTop = 150;
    const itemHeight = 25;
    const pageHeight = doc.page.height - 100;
    let currentY = tableTop;
    let currentPage = 1;

    // Table headers
    const drawTableHeader = (y) => {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Student Name', 50, y, { width: 120, continued: false });
      doc.text('Roll No', 170, y, { width: 70, continued: false });
      doc.text('Department', 240, y, { width: 100, continued: false });
      doc.text('Room', 340, y, { width: 60, continued: false });
      doc.text('Floor', 400, y, { width: 50, continued: false });
      doc.text('Seat', 450, y, { width: 50, continued: false });
      
      // Draw line under header
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      
      return y + itemHeight;
    };

    currentY = drawTableHeader(currentY);

    // Add data rows
    doc.font('Helvetica').fontSize(9);
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];

      // Check if we need a new page
      if (currentY + itemHeight > pageHeight) {
        doc.addPage();
        currentPage++;
        currentY = 50;
        currentY = drawTableHeader(currentY);
      }

      // Draw row data
      doc.text(row.student_name, 50, currentY, { width: 120, continued: false });
      doc.text(row.roll_no, 170, currentY, { width: 70, continued: false });
      doc.text(row.department, 240, currentY, { width: 100, continued: false });
      doc.text(row.room_no, 340, currentY, { width: 60, continued: false });
      doc.text(row.floor, 400, currentY, { width: 50, continued: false });
      doc.text(String(row.seat_number), 450, currentY, { width: 50, continued: false });

      currentY += itemHeight;
    }

    // Add footer
    const totalPages = currentPage;
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        doc.switchToPage(i);
      }
      doc.fontSize(8).text(
        `Page ${i + 1} of ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export as PDF' });
  }
});

// Export seat allotments by room (PDF)
router.get('/allotments/pdf/room/:roomId', authMiddleware(['admin']), async (req, res) => {
  try {
    const { roomId } = req.params;

    const result = await pool.query(`
      SELECT 
        s.name as student_name,
        s.roll_no,
        s.department,
        r.room_no,
        r.floor,
        r.capacity,
        sa.seat_number
      FROM seat_allotments sa
      JOIN students s ON sa.student_id = s.id
      JOIN rooms r ON sa.room_id = r.id
      WHERE r.id = $1
      ORDER BY sa.seat_number
    `, [roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No seat allotments found for this room' });
    }

    const room = result.rows[0];

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=room_${room.room_no}_allotment.pdf`);

    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Room Seat Allotment', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Room: ${room.room_no}`, { align: 'center' });
    doc.text(`Floor: ${room.floor}`, { align: 'center' });
    doc.text(`Capacity: ${room.capacity}`, { align: 'center' });
    doc.moveDown(2);

    // Table
    let y = 180;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Seat', 50, y, { width: 50 });
    doc.text('Roll No', 100, y, { width: 100 });
    doc.text('Student Name', 200, y, { width: 150 });
    doc.text('Department', 350, y, { width: 150 });
    
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    y += 25;

    doc.font('Helvetica').fontSize(9);
    
    for (const row of result.rows) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(String(row.seat_number), 50, y, { width: 50 });
      doc.text(row.roll_no, 100, y, { width: 100 });
      doc.text(row.student_name, 200, y, { width: 150 });
      doc.text(row.department, 350, y, { width: 150 });
      
      y += 20;
    }

    doc.end();
  } catch (error) {
    console.error('Room PDF export error:', error);
    res.status(500).json({ error: 'Failed to export room allotment' });
  }
});

module.exports = router;
