# Examination Seat Allotment System - Backend

A comprehensive backend system for managing examination seat allotments built with Node.js and PostgreSQL.

## Features

1. **Authentication System**
   - Admin login with email and password
   - Student login with roll number and date of birth
   - JWT-based authentication

2. **Data Management**
   - Upload students data via CSV/Excel files
   - Upload rooms data via CSV/Excel files
   - Upload invigilators data via CSV/Excel files

3. **Seat Allotment**
   - Automatic seat assignment algorithm
   - Manual seat modification by admin
   - Real-time allotment statistics

4. **Export Functionality**
   - Export seat allotments as Excel
   - Export seat allotments as PDF
   - Export room-wise allotment reports

## Tech Stack

- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **File Processing:** Multer, csv-parser, xlsx
- **PDF Generation:** PDFKit
- **Security:** bcryptjs for password hashing

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   cd "d:\Mini Project"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the values in `.env` file:
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=exam_seat_allotment
     DB_USER=postgres
     DB_PASSWORD=your_password
     JWT_SECRET=your_jwt_secret_key
     PORT=3000
     ADMIN_EMAIL=admin@example.com
     ADMIN_PASSWORD=admin123
     ```

4. **Create PostgreSQL database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE exam_seat_allotment;
   
   # Exit psql
   \q
   ```

5. **Initialize database tables**
   ```bash
   npm run init-db
   ```

## Running the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### 1. Admin Login
- **POST** `/api/auth/login/admin`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "admin"
    }
  }
  ```

#### 2. Student Login
- **POST** `/api/auth/login/student`
- **Body:**
  ```json
  {
    "roll_no": "CS2021001",
    "date_of_birth": "2003-05-15"
  }
  ```

### Upload Endpoints (Admin Only)

#### 3. Upload Students
- **POST** `/api/upload/students/upload`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** FormData with file (CSV/Excel)
- **CSV Format:**
  ```
  name,roll_no,date_of_birth,department,academic_year
  John Doe,CS2021001,2003-05-15,Computer Science,2021-2025
  ```

#### 4. Upload Rooms
- **POST** `/api/upload/rooms/upload`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** FormData with file (CSV/Excel)
- **CSV Format:**
  ```
  room_no,capacity,floor
  R101,30,1
  R102,25,1
  ```

#### 5. Upload Invigilators
- **POST** `/api/upload/invigilators/upload`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** FormData with file (CSV/Excel)
- **CSV Format:**
  ```
  name,invigilator_id
  Dr. Smith,INV001
  Prof. Johnson,INV002
  ```

### Allotment Endpoints

#### 6. Trigger Seat Allotment
- **POST** `/api/allotment/allot`
- **Headers:** `Authorization: Bearer <token>`
- **Description:** Automatically assigns seats to all students

#### 7. Get All Allotments
- **GET** `/api/allotment/allotments`
- **Headers:** `Authorization: Bearer <token>`

#### 8. Get My Seat (Student)
- **GET** `/api/allotment/my-seat`
- **Headers:** `Authorization: Bearer <token>`

#### 9. Update Seat Allotment
- **PUT** `/api/allotment/allotments/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "room_id": 2,
    "seat_number": 15
  }
  ```

#### 10. Delete Seat Allotment
- **DELETE** `/api/allotment/allotments/:id`
- **Headers:** `Authorization: Bearer <token>`

#### 11. Get Statistics
- **GET** `/api/allotment/statistics`
- **Headers:** `Authorization: Bearer <token>`

### Export Endpoints

#### 12. Export as Excel
- **GET** `/api/export/allotments/excel`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Downloads Excel file

#### 13. Export as PDF
- **GET** `/api/export/allotments/pdf`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Downloads PDF file

#### 14. Export Room-wise PDF
- **GET** `/api/export/allotments/pdf/room/:roomId`
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Downloads PDF file for specific room

### Data Management Endpoints

#### 15. Get All Students
- **GET** `/api/upload/students`
- **Headers:** `Authorization: Bearer <token>`

#### 16. Get All Rooms
- **GET** `/api/upload/rooms`
- **Headers:** `Authorization: Bearer <token>`

#### 17. Get All Invigilators
- **GET** `/api/upload/invigilators`
- **Headers:** `Authorization: Bearer <token>`

## Database Schema

### Tables

1. **users** - Stores admin and student login credentials
2. **students** - Student information
3. **rooms** - Examination room details
4. **invigilators** - Invigilator information
5. **seat_allotments** - Seat assignment records

## Sample CSV Files

### students.csv
```csv
name,roll_no,date_of_birth,department,academic_year
John Doe,CS2021001,2003-05-15,Computer Science,2021-2025
Jane Smith,CS2021002,2003-08-20,Computer Science,2021-2025
Mike Johnson,EE2021001,2003-03-10,Electrical Engineering,2021-2025
```

### rooms.csv
```csv
room_no,capacity,floor
R101,30,1
R102,25,1
R201,30,2
R202,25,2
```

### invigilators.csv
```csv
name,invigilator_id
Dr. Smith,INV001
Prof. Johnson,INV002
Dr. Williams,INV003
```

## Testing with Postman/Thunder Client

1. **Login as Admin**
   - POST to `/api/auth/login/admin`
   - Copy the token from response

2. **Upload Data**
   - Use the token in Authorization header
   - Upload CSV/Excel files

3. **Trigger Allotment**
   - POST to `/api/allotment/allot`

4. **Export Reports**
   - GET `/api/export/allotments/excel` or `/api/export/allotments/pdf`

## Project Structure

```
d:\Mini Project\
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── database/
│   │   └── init.js              # Database initialization script
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── upload.js            # File upload routes
│   │   ├── allotment.js         # Seat allotment routes
│   │   └── export.js            # Export routes
│   └── server.js                # Main application file
├── uploads/                     # Temporary file uploads (auto-created)
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore file
├── package.json                 # Project dependencies
└── README.md                    # Project documentation
```

## Security Features

- Password hashing using bcryptjs
- JWT-based authentication
- Role-based access control (Admin/Student)
- Protected API endpoints
- Input validation

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Future Enhancements

- Email notifications to students
- SMS notifications
- Real-time seat availability
- Multiple exam session support
- Department-wise seat distribution
- Invigilator assignment to rooms
- Student attendance tracking

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
