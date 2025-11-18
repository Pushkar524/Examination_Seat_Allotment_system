# Seat Allotment System - User Guide

## Three Methods of Seat Allotment

### 1. 🖊️ Manual Allotment

**Use Case:** When you need precise control over individual seat assignments.

**How it works:**
1. Click the **"Manual Allotment"** button (blue button)
2. Select a student from the dropdown list
3. Student name and course are auto-filled
4. Select the examination from available exams
5. Choose the room from available rooms
6. Enter the specific seat number
7. Click **"Assign Seat"** to save

**Best for:**
- Special cases requiring specific seat assignments
- VIP students or students with special needs
- Making individual adjustments
- Testing the system with a few students

---

### 2. ⚡ Automatic Allotment

**Use Case:** When you need to quickly assign seats to many students at once.

**How it works:**
1. Click the **"Automatic Allotment"** button (green button)
2. Select an examination from the dropdown
3. Select one or more rooms using checkboxes
4. The system automatically:
   - Finds all students whose course matches the exam subject
   - Sorts students by their Student ID (USN) in ascending order
   - Distributes students across selected rooms based on capacity
   - Assigns sequential seat numbers starting from 1 in each room
5. Click **"Generate Allotments"** to create all assignments

**Features:**
- ✅ Shows total capacity of selected rooms
- ✅ Validates that there's enough capacity for all students
- ✅ Prevents over-allocation
- ✅ Ensures fair distribution based on Student ID

**Best for:**
- Large batches of students
- Regular exam schedules
- Quick deployment
- Standardized seating arrangements

**Example:**
- Exam: "Computer Science Finals"
- Rooms: Room 101 (30 capacity), Room 102 (30 capacity)
- Result: 60 CS students sorted by USN and distributed evenly

---

### 3. ✏️ Editing After Allotment

**Use Case:** When you need to modify existing seat assignments.

**How it works:**
1. Find the student's allotment in the table
2. Click the **"Edit"** button (yellow button) next to their row
3. Modify any field:
   - Change the examination
   - Reassign to a different room
   - Update the seat number
4. Click **"Update Allotment"** to save changes

**Features:**
- ✅ All fields are editable
- ✅ Same user-friendly interface as manual allotment
- ✅ Auto-fills current values
- ✅ Validates changes before saving

**Best for:**
- Correcting mistakes
- Accommodating last-minute changes
- Handling student requests for seat changes
- Resolving conflicts

---

## Additional Features

### 🔍 Search and Filter
- **Search Box:** Find students by name or ID
- **Course Filter:** View allotments by course/department
- **Exam Filter:** View allotments for specific examinations
- **Room Filter:** View allotments for specific rooms

### 📊 Dashboard Statistics
- **Total Students Alloted:** Automatically counts all assigned students
- **Total Rooms Used:** Shows unique rooms with assignments

### 🗑️ Delete Allotments
- Click the **"Delete"** button (red button) to remove an allotment
- Confirmation dialog prevents accidental deletions

---

## Workflow Recommendations

### For Small Exams (< 50 students):
1. Use **Manual Allotment** for complete control
2. Or use **Automatic Allotment** with a single room

### For Large Exams (> 50 students):
1. Use **Automatic Allotment** to quickly assign most students
2. Use **Edit** to handle special cases or corrections

### For Multiple Exam Sessions:
1. Run **Automatic Allotment** separately for each exam
2. Select appropriate rooms for each session
3. Use filters to verify each session separately

---

## Tips & Best Practices

✅ **Before Automatic Allotment:**
- Ensure all students are registered with correct courses
- Verify all rooms have accurate capacity numbers
- Check that exam subjects match student departments

✅ **Data Consistency:**
- Student ID should be consistent (e.g., all uppercase, proper format)
- Room numbers should be standardized
- Exam subjects should match course names

✅ **Backup Your Data:**
- All data is stored in browser localStorage
- Use browser export features or take screenshots of important allotments
- Consider implementing CSV export for backups

---

## Troubleshooting

**Q: Automatic allotment says "No eligible students found"**
- Check that exam subject matches student course/department names
- Verify students are registered in the system
- Try partial matching (e.g., "CS" should match "Computer Science")

**Q: Not enough capacity error**
- Select more rooms in the automatic allotment
- Or reduce the number of students for this exam

**Q: Can I run automatic allotment multiple times?**
- Yes! Each run adds new allotments
- Existing allotments are not affected
- Use filters to view each batch separately

**Q: How do I clear all allotments?**
- Currently, delete allotments individually
- Or clear browser localStorage to reset everything (caution: this clears all data)

---

## Future Enhancements (Planned)

- 📄 Export allotments to PDF/CSV
- 🔄 Bulk delete by exam or room
- 📧 Email/print seat tickets for students
- 🎨 Customizable seat arrangement patterns
- 🔐 Prevent accidental data loss with confirmation dialogs
- 📱 Mobile-responsive seat assignment interface

---

**Need Help?** Contact the system administrator or refer to the main application README.
