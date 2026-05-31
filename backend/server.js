require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { router: authRouter } = require('./routes/auth');
const membersRouter = require('./routes/members');
const attendanceRouter = require('./routes/attendance');
const eventsRouter = require('./routes/events');

// DB is initialized on require — schema + seed runs immediately
require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  next();
});

// Endpoint to log browser runtime errors
app.post('/api/log-error', (req, res) => {
  console.error('\n❌ [BROWSER RUNTIME ERROR]', JSON.stringify(req.body, null, 2), '\n');
  res.status(204).send();
});

app.use('/api/auth',       authRouter);
app.use('/api/members',    membersRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/events',     eventsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AttendX API running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 AttendX API ready`);
  console.log(`🔑 Default credentials: admin / admin123\n`);
});
