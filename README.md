# AttendX – School Attendance Management System

A full-stack attendance management web application built with **React** (frontend) and **Node.js + Express** (backend), with a **SQLite** database.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16 or higher
- npm v8 or higher

---

### 1. Start the Backend

```bash
cd backend
npm install
node server.js
```

Server starts at **http://localhost:5000**

Default credentials: `admin` / `admin123`

---

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

App opens at **http://localhost:3000**

---

## 📁 Project Structure

```
attendance-system/
├── backend/
│   ├── db/
│   │   └── database.js          # SQLite via sql.js, schema & seed
│   ├── routes/
│   │   ├── auth.js              # Login, JWT middleware
│   │   ├── members.js           # CRUD for members
│   │   └── attendance.js        # Sessions, save, report
│   ├── server.js                # Express app entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js   # Login state + axios setup
│   │   ├── components/
│   │   │   ├── Layout.js        # Sidebar + header shell
│   │   │   └── Layout.css
│   │   ├── pages/
│   │   │   ├── Login.js/css     # Auth page
│   │   │   ├── Master.js/css    # Member management tab
│   │   │   ├── Attendance.js/css# Mark attendance tab
│   │   │   └── Reports.js/css   # View + export tab
│   │   ├── App.js               # Root + tab router
│   │   └── index.css            # Global variables + fonts
│   └── package.json
│
└── README.md
```

---

## 🎯 Features

### 🔐 Login Page
- Username/password authentication with JWT
- Violet school-management-style UI
- Default: `admin` / `admin123`

### 👥 Master Tab
- Add members: Name, Course, Year, Enrollment No., Semester, Admission No.
- Edit and delete members
- Search/filter members
- Unique validation for Enrollment No. and Admission No.

### ✅ Attendance Tab
- Pick date and enter event name
- Search members in checklist
- Toggle individual or select all
- Live stats: Present / Absent / Total / %
- Save to database (idempotent – saves to same session if date + event match)

### 📊 Reports Tab
- View all sessions date-wise
- Filter by date and/or event name
- Expand any session to see full member-wise records
- Summary: total sessions, records, present count, average rate
- **Export to Excel** (.xlsx)
- **Export to CSV**
- Delete individual sessions

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, CSS3, Axios |
| Backend | Node.js, Express 4 |
| Database | SQLite (via sql.js – pure JS) |
| Auth | JWT + bcryptjs |
| Export | xlsx + file-saver |
| Notifications | react-hot-toast |

---

## 🔧 API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/members` | List all members |
| POST | `/api/members` | Add member |
| PUT | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Delete member |
| GET | `/api/attendance/sessions` | List sessions |
| POST | `/api/attendance/save` | Save attendance |
| GET | `/api/attendance/report` | Full report with filters |
| DELETE | `/api/attendance/sessions/:id` | Delete session |

---

## 🎨 Design

- Violet school-management color palette
- `Outfit` font (headings/body) + `Space Mono` (codes)
- Fully responsive: desktop sidebar + mobile hamburger menu
- Smooth animations, skeleton loading states
- Violet gradient sidebar, clean white content area
