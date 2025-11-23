# Examination Seat Allotment System

A comprehensive full-stack system for managing examination seat allotments with automatic seat assignment algorithm, built with Node.js, PostgreSQL, React, and Tailwind CSS.

## 🌟 Features

### Authentication
- **Admin Login:** Email and password-based authentication
- **Student Login:** Roll number and date of birth-based authentication
- JWT-based secure authentication system

### Data Management
- **Bulk Upload:** Import students, rooms, and invigilators via CSV/Excel files
- **Manual Entry:** Add individual records through user-friendly forms
- **Real-time Updates:** Instant data synchronization across the system

### Seat Allotment
- **Automatic Assignment:** Intelligent algorithm distributes students across rooms based on capacity
- **Visual Seat Selection:** Interactive grid-based seat selection (like bus booking)
- **Smart Allotment:** Advanced pattern-based seating with anti-cheating strategies
  - Department/Year-based student segregation
  - Criss-cross (zigzag) pattern or linear arrangement
  - Configurable students per bench (2 or 3)
  - Automatic invigilator assignment
  - Vacancy warnings for rooms without invigilators
- **Bench-Based Layout:** Configure rooms with number of benches and seats per bench
- **Sorted by Roll Number:** Students assigned in ascending order
- **Manual Modifications:** Admin can update seat assignments as needed
- **Statistics Dashboard:** Real-time allotment progress tracking

### Invigilator Management
- **Room Assignment:** Assign invigilators to specific examination rooms
- **Visual Assignment Page:** Dedicated interface for managing invigilator-room mappings
- **Real-time Updates:** Instantly view and modify assignments
- **Assignment Statistics:** Track assigned vs unassigned invigilators

### Export & Reports
- **Excel Export:** Download complete allotment data as spreadsheet
- **PDF Reports:** Generate formatted allotment documents
- **Room-wise PDF Reports:** Individual room allotment sheets with invigilator details
- **Automated Downloads:** Browser-based file downloads with proper authentication

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
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v6
- **State Management:** React Context API
- **API Communication:** Native Fetch API

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
│   │   ├── upload.js            # File upload & manual add endpoints
│   │   ├── allotment.js         # Seat allotment endpoints
│   │   └── export.js            # Export endpoints
│   └── server.js                # Express application entry point
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx        # Reusable modal component
│   │   │   └── Sidebar.jsx      # Navigation sidebar
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Authentication state management
│   │   │   └── DataContext.jsx  # Data state management
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Dashboard.jsx    # Admin dashboard with statistics
│   │   │   ├── RegisterStudents.jsx  # Student management
│   │   │   ├── RegisterStaff.jsx     # Invigilator management
│   │   │   ├── Rooms.jsx             # Room management
│   │   │   └── FinalAllotment.jsx    # Seat allotment page
│   │   ├── services/
│   │   │   └── api.js           # API service layer
│   │   └── App.jsx              # Main application component
│   ├── index.html
│   ├── tailwind.config.cjs
│   └── vite.config.js
├── sample-data/                  # Sample CSV files for testing
│   ├── students.csv
│   ├── rooms.csv
│   └── invigilators.csv
├── uploads/                      # Temporary upload directory (auto-created)
├── .env.example                  # Environment template
├── package.json                  # Backend dependencies
└── README.md                     # This file
```

## 📊 Database Schema

### Tables

1. **users** - Admin and student login credentials
   - id, email, password, role

2. **students** - Student information
   - id, user_id, name, roll_no, date_of_birth, department, academic_year

3. **rooms** - Examination room details
   - id, room_no, capacity, floor, number_of_benches, seats_per_bench

4. **invigilators** - Invigilator information
   - id, name, invigilator_id, room_id (foreign key to rooms, unique constraint)

5. **seat_allotments** - Seat assignment records
   - id, student_id, room_id, seat_number, allotment_date

## 🎨 Smart Allotment Patterns

### Criss-Cross Pattern (Zigzag)
Alternates students from different departments/groups to prevent cheating:
```
Bench 1: [CS] [IT] [CS] [IT] [CS] [IT]
Bench 2: [IT] [CS] [IT] [CS] [IT] [CS]
Bench 3: [CS] [IT] [CS] [IT] [CS] [IT]
Bench 4: [IT] [CS] [IT] [CS] [IT] [CS]
```
**Benefits:** Maximum separation between students from same department

### Linear Pattern (Strict)
Groups students by department, fills one section before moving to next:
```
Bench 1: [CS] [CS] [CS] [CS] [CS] [CS]
Bench 2: [CS] [CS] [CS] [CS] [CS] [CS]
Bench 3: [IT] [IT] [IT] [IT] [IT] [IT]
Bench 4: [IT] [IT] [IT] [IT] [IT] [IT]
```
**Benefits:** Easier to manage, students from same department sit together

## 🎯 Usage Guide

### For Administrators

1. **Login:** Use admin credentials (default: admin@example.com / admin123)

2. **Upload Data:**
   - Navigate to "Manage Students" and upload student CSV/Excel or add manually
   - Navigate to "Rooms" and upload room CSV/Excel or add manually
   - Navigate to "Invigilators" and upload invigilator CSV/Excel or add manually

3. **Generate Allotment:**
   - **Option A - Automatic Allotment:**
     - Go to "Seat Allotment" page
     - Click "Generate Allotments" button
     - System automatically assigns seats to all students
   - **Option B - Visual Seat Selection:**
     - Go to "Visual Seat Selection" page
     - Select a room from the dropdown
     - Click on seats in the grid to select them (like bus booking)
     - Click "Next" and select students to assign
     - Click "Assign Seats" to finalize
   - **Option C - Smart Allotment (Recommended):**
     - Go to "Smart Allotment" page
     - Select segregation criteria (Department or Year of Joining)
     - Choose seating pattern:
       - Criss-Cross: Alternates students from different groups (prevents cheating)
       - Linear/Strict: Fills one group completely before next
     - Set students per bench (2 or 3)
     - Optionally select specific rooms or use all available
     - Click "Start Smart Allotment"
     - System automatically:
       - Segregates students by selected criteria
       - Applies chosen seating pattern
       - Assigns invigilators to rooms
       - Shows warnings for rooms without invigilators

4. **Assign Invigilators:**
   - Navigate to "Assign Invigilators" page
   - View all invigilators and their current assignments
   - Use dropdown to assign invigilators to specific rooms
   - **Note:** Each room can only be assigned to one invigilator. Already assigned rooms are disabled in the dropdown.
   - Assignments are saved immediately

5. **View & Export:**
   - View complete allotment table with room and seat details
   - Click "Export Excel" for spreadsheet download
   - Click "Export PDF" for formatted document
   - Use "Export by Room" dropdown for room-specific PDF reports
   - Navigate to "Reports" page to view:
     - Student allotments by room with seat numbers
     - Invigilator assignments with student counts
     - Vacant room warnings (rooms without invigilators highlighted in red)
     - Export separate CSV reports for students and invigilators

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
- `POST /api/allotment/allot` - Trigger automatic seat allotment
- `GET /api/allotment/allotments` - Get all allotments
- `GET /api/allotment/statistics` - Get allotment statistics
- `PUT /api/allotment/allotments/:id` - Update seat assignment
- `DELETE /api/allotment/allotments/:id` - Delete seat assignment

### Smart Allotment (Admin Only)
- `POST /api/smart-allotment/smart-allot` - Trigger pattern-based smart allotment
  - Body: `{ segregate_by, students_per_bench, pattern, room_ids }`
  - Segregates students by department or year
  - Applies criss-cross or linear seating pattern
  - Auto-assigns invigilators to rooms
- `GET /api/smart-allotment/allotment-report` - Get comprehensive reports
  - Returns student allotments with room/seat details
  - Returns invigilator assignments with student counts
  - Highlights vacant rooms without invigilators

### Student Endpoints
- `GET /api/allotment/my-seat` - Get student's assigned seat

### Export (Admin Only)
- `GET /api/export/allotments/excel` - Download Excel report (all allotments)
- `GET /api/export/allotments/pdf` - Download PDF report (all allotments)
- `GET /api/export/allotments/pdf/room/:roomId` - Download room-wise PDF report with invigilator details

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
- Students can login using their roll number and date of birth
- Student passwords are auto-generated from date of birth
- Files uploaded are temporarily stored and deleted after processing
- Duplicate entries (by roll_no/room_no/invigilator_id) will update existing records

## 🚧 Future Enhancements

- Email notifications for seat allotments
- SMS integration for student notifications
- Multi-session exam support
- Department-wise seat clustering
- Invigilator room assignment
- Student attendance tracking
- Analytics dashboard
- Bulk student account management

## 📜 License

ISC

## 👨‍💻 Author

Pushkar524

## 🔗 Repository

[https://github.com/Pushkar524/Examination_Seat_Allotment_system](https://github.com/Pushkar524/Examination_Seat_Allotment_system)

## 🤝 Support

For issues and questions, please create an issue in the GitHub repository.
