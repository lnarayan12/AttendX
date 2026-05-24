const express = require('express');
const cors = require('cors');
const { router: authRouter } = require('./routes/auth');
const membersRouter = require('./routes/members');
const attendanceRouter = require('./routes/attendance');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize DB on startup
getDb();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/attendance', attendanceRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Attendance System API running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Attendance System API ready`);
  console.log(`🔑 Default credentials: admin / admin123\n`);
});
