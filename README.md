# Student Task Manager

A simple, clean, full-stack web application designed for students to organize, manage, and track their academic tasks and assignments.

Built with **HTML, CSS, Vanilla JavaScript** on the frontend, **Node.js & Express.js** on the backend, and **MySQL** for persistent database storage.

---

## Features

1. **Student Registration**: Create a student account with name, email, and secure password.
2. **Student Login**: Authenticate securely using JWT (JSON Web Tokens).
3. **Add Task**: Create new tasks with title and optional description.
4. **Edit Task**: Update task title, description, and status.
5. **Delete Task**: Remove unwanted tasks with confirmation.
6. **Mark as Completed**: Toggle task completion status with a single click.
7. **Filter Tasks**: View tasks filtered by **All**, **Pending**, or **Completed**.
8. **View Student Tasks**: Students can only view and manage their own tasks (strict student isolation).

---

## Project Structure

```
student-task-manager/
│
├── frontend/
│   ├── index.html           # Landing page
│   ├── login.html           # Student login page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # Task dashboard (CRUD & Filter)
│   ├── css/
│   │   └── style.css        # Clean, modern responsive CSS
│   └── js/
│       ├── login.js         # Authentication client script
│       ├── register.js      # Registration client script
│       └── dashboard.js     # Task management client script
│
├── backend/
│   ├── server.js            # Express application server
│   ├── db.js                # MySQL database connection pool & auto-init
│   ├── schema.sql           # Database creation & table schemas
│   ├── routes/
│   │   ├── auth.js          # /api/auth/register & /api/auth/login
│   │   └── tasks.js         # /api/tasks CRUD endpoints
│   ├── .env.example         # Environment configuration template
│   └── package.json         # Node.js dependencies
│
└── README.md                # Documentation and setup instructions
```

---

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No React, Angular, Vue, Bootstrap, or Tailwind).
- **Backend**: Node.js, Express.js (REST APIs).
- **Database**: MySQL (`mysql2/promise`).
- **Security**: Passwords hashed with `bcryptjs`, session authorization via `jsonwebtoken` (JWT).

---

## Database Setup

The database schema is defined in `backend/schema.sql`:

### 1. Database & Tables

```sql
CREATE DATABASE IF NOT EXISTS student_task_manager;
USE student_task_manager;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
```

### 2. Automatic Initialization
When you start the backend server, `db.js` will automatically attempt to create the database and tables if your MySQL service is running with root access.

Alternatively, you can manually run `schema.sql` inside **MySQL Workbench**, **phpMyAdmin**, or the MySQL CLI:
```bash
mysql -u root -p < backend/schema.sql
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MySQL** (v8.0+ or MariaDB / XAMPP / WAMP)

### 2. Backend Configuration
Navigate to the `backend/` directory:
```bash
cd backend
```

Create a `.env` file (or use the provided defaults):
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=student_task_manager
JWT_SECRET=student_task_manager_secret_key_2026
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Backend Server
```bash
npm start
```
The server will start listening at:
`http://localhost:5000`

### 5. Access Frontend
Because the Express backend is configured to statically serve the `frontend/` directory, simply open your browser and navigate to:
**`http://localhost:5000`**

Or you can open `frontend/index.html` directly in your browser or with VS Code Live Server.

---

## REST API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new student | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/auth/login` | Login student and get JWT | `{ "email": "...", "password": "..." }` |

### Tasks (`/api/tasks`) - Requires `Authorization: Bearer <token>`
| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Get all tasks for logged-in student (optional `?status=pending` or `?status=completed`) | *None* |
| `POST` | `/api/tasks` | Create a new task | `{ "title": "...", "description": "..." }` |
| `PUT` | `/api/tasks/:id` | Update an existing task | `{ "title": "...", "description": "...", "status": "..." }` |
| `PUT` | `/api/tasks/:id/complete` | Toggle or set task completion | Optional `{ "status": "completed" }` |
| `DELETE` | `/api/tasks/:id` | Delete a task | *None* |

---

## Student Data Isolation
Every task query is bound strictly to `req.student.id` extracted from the verified JWT token:
- Students can only retrieve tasks where `student_id = req.student.id`.
- Modifying or deleting another student's task is blocked at the database query level (`WHERE id = ? AND student_id = ?`).
