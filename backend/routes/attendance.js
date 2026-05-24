const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET all sessions (with optional date/event filter)
router.get('/sessions', authenticateToken, (req, res) => {
  const { date, event } = req.query;
  let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
  const params = [];
  if (date)  { query += ' AND date = ?';            params.push(date); }
  if (event) { query += ' AND event_name LIKE ?';   params.push(`%${event}%`); }
  query += ' ORDER BY date DESC';
  res.json(db.prepare(query).all(...params));
});

// GET single session with member records
router.get('/sessions/:sessionId', authenticateToken, (req, res) => {
  const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const records = db.prepare(`
    SELECT m.*, COALESCE(ar.present, 0) as present
    FROM members m
    LEFT JOIN attendance_records ar ON ar.member_id = m.id AND ar.session_id = ?
    ORDER BY m.name ASC
  `).all(req.params.sessionId);

  res.json({ session, records });
});

// POST save attendance (idempotent — upserts into existing session if date+event match)
router.post('/save', authenticateToken, (req, res) => {
  const { date, event_name, attendance } = req.body;
  if (!date || !event_name || !attendance)
    return res.status(400).json({ error: 'Missing fields' });

  // Wrap in transaction so either everything saves or nothing does
  const saveAttendance = db.transaction(() => {
    let session = db.prepare(
      'SELECT * FROM attendance_sessions WHERE date = ? AND event_name = ?'
    ).get(date, event_name);

    if (!session) {
      const result = db.prepare(
        'INSERT INTO attendance_sessions (date, event_name) VALUES (?, ?)'
      ).run(date, event_name);
      session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(result.lastInsertRowid);
    }

    const upsert = db.prepare(`
      INSERT INTO attendance_records (session_id, member_id, present)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id, member_id) DO UPDATE SET present = excluded.present
    `);

    for (const record of attendance) {
      upsert.run(session.id, record.member_id, record.present ? 1 : 0);
    }

    return session;
  });

  try {
    const session = saveAttendance();
    res.json({ message: 'Attendance saved', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE session and all its records (cascade handles records automatically)
router.delete('/sessions/:sessionId', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM attendance_sessions WHERE id = ?').run(req.params.sessionId);
  res.json({ message: 'Deleted' });
});

// GET full report (all sessions with member-wise breakdown)
router.get('/report', authenticateToken, (req, res) => {
  const { date, event } = req.query;
  let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
  const params = [];
  if (date)  { query += ' AND date = ?';           params.push(date); }
  if (event) { query += ' AND event_name LIKE ?';  params.push(`%${event}%`); }
  query += ' ORDER BY date DESC';

  const sessions = db.prepare(query).all(...params);

  const recordsStmt = db.prepare(`
    SELECT m.name, m.enrollment_no, m.course, m.year, m.semester, m.admission_no, ar.present
    FROM attendance_records ar
    JOIN members m ON m.id = ar.member_id
    WHERE ar.session_id = ?
    ORDER BY m.name ASC
  `);

  const report = sessions.map(session => {
    const records = recordsStmt.all(session.id);
    const presentCount = records.filter(r => r.present === 1).length;
    return {
      ...session,
      records,
      total: records.length,
      present: presentCount,
      absent: records.length - presentCount,
    };
  });

  res.json(report);
});

module.exports = router;
