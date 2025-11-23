# Quick Troubleshooting Guide

## Issue: "Failed to load data" / Blank pages / Zero data

### ✅ Data Status (Verified)
Your database still has all data:
- **Students:** 6 records
- **Rooms:** 7 records  
- **Invigilators:** 5 records

**Nothing was deleted!**

### 🔧 Fix Steps

#### 1. Check Server URLs
- Backend: `http://localhost:3000` ✅
- Frontend: `http://localhost:5174` (NOT 5173!)

#### 2. Clear Browser & Reconnect
```
1. Close ALL browser tabs with localhost:5173 or localhost:5174
2. Press Ctrl + Shift + Delete
3. Check "Cached images and files"
4. Click "Clear data"
5. Open new tab: http://localhost:5174
6. Login with admin credentials
```

#### 3. Check Browser Console
Press `F12` → Console tab
Look for:
- ❌ CORS errors → Backend not running
- ❌ 401 errors → Need to login again
- ❌ Network errors → Wrong URL/port

#### 4. If Data Still Missing

**Option A: Re-upload sample data**
```bash
cd "d:\Mini Projects\Thelastoneforsure\Examination_Seat_Allotment_system"
# Use the UI to upload CSV files from sample-data folder
```

**Option B: Verify backend connection**
```bash
# Test backend directly
curl http://localhost:3000/api/health
```

**Option C: Check authentication**
- Logout and login again
- Token might have expired
- Check localStorage has 'token' key

### 🐛 Known Issues Fixed

1. **Sidebar menu**: Now organized with sections
2. **Seat Allotment**: Unified page with Smart/Manual tabs
3. **Routes**: All updated to new structure

### 📋 Current Navigation
- 🪑 SEAT ALLOTMENT → Main page (tabs for Smart/Manual)
- 🎫 VISUAL SELECT → Grid-based selection
- 📋 REPORTS → Comprehensive reports
- 👨‍🎓 STUDENTS → Register students
- 👨‍🏫 INVIGILATORS → Register staff
- 🏢 ROOMS → Manage rooms
- 📌 ASSIGN STAFF → Assign invigilators

### ⚡ Quick Test
1. Go to: `http://localhost:5174/students`
2. You should see 6 students
3. If empty → Login issue
4. If "Failed to load" → Backend connection issue

### 🆘 Still Not Working?

Run this diagnostic:
```bash
cd "d:\Mini Projects\Thelastoneforsure\Examination_Seat_Allotment_system"
node -e "const pool = require('./src/config/database'); pool.query('SELECT * FROM students LIMIT 1').then(r => console.log('Sample student:', r.rows[0])).then(() => pool.end()).catch(e => { console.error('Error:', e.message); pool.end(); })"
```

This will show if database connection works.
