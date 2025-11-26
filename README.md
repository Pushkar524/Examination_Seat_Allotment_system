# Examination Seat Allotment System

A comprehensive full-stack system for managing examination seat allotments with visual seat selection and pattern-based allocation, built with Node.js, PostgreSQL, React, and Tailwind CSS.

## 🌟 Features

### Authentication
- **Admin Login:** Email and password-based authentication
- **Student Login:** Roll number and date of birth-based authentication
- JWT-based secure authentication system
- Protected routes with automatic redirection to login

### Data Management
- **Bulk Upload:** Import students, rooms, and invigilators via CSV files
- **Manual Entry:** Add individual records through user-friendly forms
- **Real-time Updates:** Instant data synchronization across the system
- **Data Validation:** Duplicate detection and update on re-upload

### Visual Seat Allotment
- **Interactive Seat Grid:** Visual seat selection interface (like movie/bus booking)
- **Pattern-Based Selection:**
  - Pattern 1: Alternate columns (1, 3, 5, ...)
  - Pattern 2: Alternate rows (A, C, E, ...)
  - Pattern 3: Checkerboard pattern (both rows and columns)
- **Quick Selection Tools:**
  - Select All / Deselect All
  - Row-wise selection (click → arrow)
  - Column-wise selection (click ↓ arrow)
- **Flexible Student Assignment:**
  - Department-based filtering
  - Search by name, roll number, or department
  - Select All / Deselect All students
  - Assign fewer students than seats selected
- **Vertical Seat Numbering:** Seats numbered column-wise for better organization
- **Real-time Status:** Occupied (green), Selected (blue), Available (white)

### Seat Assignment
- **Manual Allotment:** Create seat assignments through visual interface
- **Bench-Based Layout:** Configure rooms with benches and seats per bench
- **Edit & Delete:** Modify or remove existing seat assignments
- **Statistics Dashboard:** Real-time allotment progress tracking

### Invigilator Management
- **Room Assignment:** Assign invigilators to specific examination rooms
- **Room-specific Assignments:** Each invigilator linked to a room
- **Real-time Updates:** View and modify assignments instantly

### Export & Reports
- **Department-wise Reports:**
  - CSV export for each department
  - PDF reports with formatted tables
  - Student count and timestamp
- **Room-wise Reports:**
  - CSV export for each room
  - PDF reports with professional layout
  - Color-coded headers (green for departments, purple for rooms)
- **Filtered Exports:** Export current search/filter results
- **Complete Export:** Excel/PDF export of all allotments
- **Automated Downloads:** Browser-based file downloads with proper naming

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL with connection pooling
- **Authentication:** JWT (JSON Web Tokens)
- **File Processing:** Multer v2.0, csv-parser, xlsx
- **PDF Generation:** PDFKit
- **Security:** bcryptjs for password hashing

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS with dark mode support
- **Routing:** React Router DOM v6 with protected routes
- **State Management:** React Context API
- **API Communication:** Native Fetch API
- **PDF Generation:** jsPDF with autoTable plugin

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Pushkar524/Examination_Seat_Allotment_system.git
cd Examination_Seat_Allotment_system
```

### 2. Backend Setup

**Install dependencies:**
```bash
npm install
```

**Configure environment variables:**
Create a `.env` file in the root directory (use `.env.example` as template):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=exam_seat_allotment
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_here
PORT=3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

**Create PostgreSQL database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE exam_seat_allotment;

# Exit
\q
```

**Initialize database:**
```bash
npm run init-db
```

**Start backend server:**
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

Backend runs on: `http://localhost:3000`

### 3. Frontend Setup

**Navigate to frontend directory:**
```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Configure environment variables:**
Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**Start frontend development server:**
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

## 📂 Project Structure

```
Examination_Seat_Allotment_system/
├── src/                          # Backend source code
│   ├── config/
│   │   └── database.js          # PostgreSQL configuration
│   ├── database/
│   │   ├── init.js              # Database schema initialization
│   │   └── migrate.js           # Migration script
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── upload.js            # File upload & data management
│   │   ├── allotment.js         # Seat allotment CRUD operations
│   │   └── export.js            # Export endpoints (Excel/PDF)
│   └── server.js                # Express application entry point
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx       # Top navigation header
│   │   │   ├── Modal.jsx        # Reusable modal component
│   │   │   ├── SeatGrid.jsx     # Visual seat selection grid
│   │   │   └── Sidebar.jsx      # Navigation sidebar
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication state management
│   │   ├── pages/
│   │   │   ├── AllotmentReports.jsx   # Reports with CSV/PDF exports
│   │   │   ├── Dashboard.jsx          # Admin dashboard with statistics
│   │   │   ├── DiagnosticPage.jsx     # System diagnostics
│   │   │   ├── InvigilatorAssignment.jsx  # Invigilator management
│   │   │   ├── Login.jsx              # Login page
│   │   │   ├── RegisterStaff.jsx      # Invigilator registration
│   │   │   ├── RegisterStudents.jsx   # Student management
│   │   │   ├── Rooms.jsx              # Room management
│   │   │   ├── SeatAllotment.jsx      # Seat allotment wrapper
│   │   │   └── VisualSeatSelection.jsx # Visual seat selection interface
│   │   ├── services/
│   │   │   └── api.js           # API service layer
│   │   ├── App.jsx              # Main application with routing
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json             # Frontend dependencies
├── sample-data/                  # Sample CSV files for testing
│   ├── students.csv
│   ├── rooms.csv
│   ├── invigilators.csv
│   └── seat_allotments.csv
├── uploads/                      # Temporary upload directory (auto-created)
├── .env                          # Environment variables (create from .env.example)
├── .env.example                  # Environment template
├── package.json                  # Backend dependencies
└── README.md                     # This file
```

## 📊 Database Schema

### Tables

1. **users** - Admin and student login credentials
   - id, email, password, role

3. **students** - Student information
   - id, name, roll_no, date_of_birth, department, academic_year

4. **rooms** - Examination room details
   - id, room_no, capacity, floor, number_of_benches, seats_per_bench

5. **invigilators** - Invigilator information
   - id, name, invigilator_id, room_id (foreign key to rooms)

6. **seat_allotments** - Seat assignment records
   - id, student_id, room_id, seat_number, subject, allotment_date

## 🎨 Visual Seat Selection Features

### Selection Patterns
The system provides three intelligent selection patterns to help administrators quickly select seats:

1. **Alternate Columns Pattern:**
   - Selects columns 1, 3, 5, 7, ... (odd columns)
   - Useful for maintaining social distancing
   - Example: Column-wise spacing between students

2. **Alternate Rows Pattern:**
   - Selects rows A, C, E, G, ... (alternate rows)
   - Useful for row-based distancing
   - Example: Every other row occupied

3. **Checkerboard Pattern:**
   - Alternates both rows and columns
   - Maximum spacing between students
   - Example: Like a checkerboard layout

### Selection Tools
- **Select All:** Quickly select all available seats in a room
- **Deselect All:** Clear current selection
- **Row Selection:** Click → arrow to toggle entire row
- **Column Selection:** Click ↓ arrow to toggle entire column
- **Individual Seats:** Click any seat to toggle selection

### Visual Indicators
- **White:** Available seat (can be selected)
- **Blue:** Currently selected seat
- **Green:** Occupied seat (already assigned to a student)

## 🎯 Usage Guide

### For Administrators

1. **Login:** Use admin credentials (default: admin@example.com / admin123)

2. **Upload Data:**
   - Navigate to "Manage Students" and upload student CSV or add manually
   - Navigate to "Rooms" and upload room CSV or add manually
   - Navigate to "Invigilators" and upload invigilator CSV or add manually

3. **Visual Seat Assignment:**
   - Go to "Seat Allotment" page
   - Select a room from the dropdown
   - Use pattern buttons for quick selection:
     - **Pattern 1:** Select alternate columns (1, 3, 5, ...)
     - **Pattern 2:** Select alternate rows (A, C, E, ...)
     - **Pattern 3:** Select checkerboard pattern
   - Or click individual seats / use row/column arrows
   - Click "Next: Select Students"
   - Filter students by department if needed
   - Use "Select All" to quickly select filtered students
   - Click "Assign Seats" to finalize
   - Unassigned seats are automatically left empty

4. **Assign Invigilators:**
   - Navigate to "Assign Invigilators" page
   - View all invigilators and their current assignments
   - Use dropdown to assign invigilators to specific rooms
   - Assignments are saved immediately

5. **View & Export Reports:**
   - Navigate to "Reports" page
   - View statistics: total allotments, departments, rooms
   - Filter by search term, department, or room
   - Export options:
     - **Filtered View:** CSV export button in header
     - **Department-wise:** CSV and PDF buttons on each department card
     - **Room-wise:** CSV and PDF buttons on each room card
   - PDF reports include formatted tables with timestamps
   - Files download with proper names (e.g., `Computer_Science_allotments.pdf`)

### For Students

1. **Login:** Enter roll number and date of birth
2. **View Seat:** Dashboard displays assigned room and seat number

## 📄 CSV File Format

### students.csv
```csv
name,roll_no,date_of_birth,department,academic_year
John Doe,CS2021001,2003-05-15,Computer Science,2021-2025
Jane Smith,CS2021002,2003-08-20,Computer Science,2021-2025
```

### rooms.csv
```csv
room_no,capacity,floor,number_of_benches,seats_per_bench
R101,30,1,5,6
R102,25,1,5,5
R201,30,2,5,6
```
Note: If number_of_benches and seats_per_bench are provided, capacity is calculated automatically.

### invigilators.csv
```csv
name,invigilator_id
Dr. Robert Smith,INV001
Prof. Maria Johnson,INV002
```

### seat_allotments.csv
```csv
student_id,room_id,seat_number,subject
1,1,1,Mathematics
2,1,7,Mathematics
3,1,13,Mathematics
```
Note: Used for sample data import. IDs must match existing students and rooms.

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login/admin` - Admin login
- `POST /api/auth/login/student` - Student login

### Data Management (Admin Only)
- `POST /api/upload/students/upload` - Bulk upload students
- `POST /api/upload/students/add` - Add single student
- `GET /api/upload/students` - Get all students
- `POST /api/upload/rooms/upload` - Bulk upload rooms
- `POST /api/upload/rooms/add` - Add single room
- `GET /api/upload/rooms` - Get all rooms
- `POST /api/upload/invigilators/upload` - Bulk upload invigilators
- `POST /api/upload/invigilators/add` - Add single invigilator
- `GET /api/upload/invigilators` - Get all invigilators (includes room assignment)
- `PATCH /api/upload/invigilators/:id/assign` - Assign invigilator to room (validates uniqueness)

### Seat Allotment (Admin Only)
- `POST /api/allotment/create` - Create single seat allotment
- `GET /api/allotment/allotments` - Get all allotments (with student/room details)
- `GET /api/allotment/statistics` - Get allotment statistics
- `PUT /api/allotment/allotments/:id` - Update seat assignment
- `DELETE /api/allotment/allotments/:id` - Delete seat assignment

### Student Endpoints
- `GET /api/allotment/my-seat` - Get student's assigned seat

### Export (Admin Only)
- `GET /api/export/allotments/excel` - Download Excel report (all allotments)
- `GET /api/export/allotments/pdf` - Download PDF report (all allotments)

## 🔒 Security Features

- Password hashing with bcryptjs (10 salt rounds)
- JWT token-based authentication
- Role-based access control (Admin/Student)
- Protected API routes with middleware
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- CORS enabled for frontend-backend communication

## 🐛 Troubleshooting

### Backend Issues

**Database connection error:**
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Ensure database exists

**Port already in use:**
- Change PORT in `.env` file
- Or kill existing process on port 3000

### Frontend Issues

**API connection error:**
- Ensure backend server is running on port 3000
- Check `VITE_API_BASE_URL` in frontend `.env`
- Verify CORS is enabled in backend

**Build errors:**
- Delete `node_modules` and reinstall: `npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## 📝 Development Notes

- Default admin credentials are created during database initialization
- Students can login using their roll number and date of birth (format: YYYY-MM-DD)
- Files uploaded are temporarily stored and deleted after processing
- Duplicate entries (by roll_no/room_no/invigilator_id) will update existing records
- Seat numbering follows vertical pattern (column-wise: top to bottom, left to right)
- Frontend uses jsPDF library for client-side PDF generation
- All routes except /login require authentication

## 🚧 Future Enhancements

- Email notifications for seat allotments
- SMS integration for student notifications
- Multi-session exam support
- Automatic allotment algorithm with department clustering
- Student attendance tracking during exams
- Analytics dashboard with visualizations
- Bulk operations for seat modifications
- Mobile-responsive improvements
- Print-optimized hall tickets

## 📜 License

ISC

## 👨‍💻 Author

Pushkar524

## 🔗 Repository

[https://github.com/Pushkar524/Examination_Seat_Allotment_system](https://github.com/Pushkar524/Examination_Seat_Allotment_system)

## 🤝 Support

For issues and questions, please create an issue in the GitHub repository.
