const express = require('express');
const { prepare } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET all sessions (with optional date/event filter)
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, event, date } = req.query;
    let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
    const params = [];
    
    // For single date lookup (most common case)
    if (date && event) {
      // Exact match for date and event name (case-insensitive)
      query = 'SELECT * FROM attendance_sessions WHERE date = ? AND LOWER(event_name) = LOWER(?)';
      params.push(date, event);
    } else {
      // Range filters
      if (startDate) { query += ' AND date >= ?';         params.push(startDate); }
      if (endDate)   { query += ' AND date <= ?';         params.push(endDate); }
      if (event)     { query += ' AND LOWER(event_name) LIKE LOWER(?)';   params.push(`%${event}%`); }
      query += ' ORDER BY date DESC';
    }
    
    const sessions = await prepare(query).all(...params);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single session with member records
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Not found' });

    const records = await prepare(`
      SELECT m.*, COALESCE(ar.present, 0) as present
      FROM members m
      LEFT JOIN attendance_records ar ON ar.member_id = m.id AND ar.session_id = ?
      ORDER BY m.name ASC
    `).all(req.params.sessionId);

    res.json({ session, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save attendance (idempotent — upserts into existing session if date+event match)
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { date, event_name, attendance } = req.body;
    if (!date || !event_name || !attendance)
      return res.status(400).json({ error: 'Missing fields' });

    // Find existing session with case-insensitive match
    let session = await prepare(
      'SELECT * FROM attendance_sessions WHERE date = ? AND LOWER(event_name) = LOWER(?)'
    ).get(date, event_name);

    if (!session) {
      // Create new session with the provided event name (preserve user's casing)
      const result = await prepare(
        'INSERT INTO attendance_sessions (date, event_name) VALUES (?, ?)'
      ).run(date, event_name);
      session = await prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(result.lastID);
    }

    for (const record of attendance) {
      await prepare(`
        INSERT INTO attendance_records (session_id, member_id, present)
        VALUES (?, ?, ?)
        ON CONFLICT(session_id, member_id) DO UPDATE SET present = excluded.present
      `).run(session.id, record.member_id, record.present ? 1 : 0);
    }

    res.json({ message: 'Attendance saved', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE session and all its records (cascade handles records automatically)
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    await prepare('DELETE FROM attendance_sessions WHERE id = ?').run(req.params.sessionId);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET full report (all sessions with member-wise breakdown)
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, event } = req.query;
    let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
    const params = [];
    if (startDate) { query += ' AND date >= ?';        params.push(startDate); }
    if (endDate)   { query += ' AND date <= ?';        params.push(endDate); }
    if (event)     { query += ' AND LOWER(event_name) LIKE LOWER(?)';  params.push(`%${event}%`); }
    query += ' ORDER BY date DESC';

    const sessions = await prepare(query).all(...params);

    const report = [];
    for (const session of sessions) {
      const records = await prepare(`
        SELECT m.id, m.name, m.enrollment_no, m.course, m.year, m.semester, m.admission_no, ar.present
        FROM attendance_records ar
        JOIN members m ON m.id = ar.member_id
        WHERE ar.session_id = ?
        ORDER BY m.name ASC
      `).all(session.id);

      const presentCount = records.filter(r => r.present === 1).length;
      report.push({
        ...session,
        records,
        total: records.length,
        present: presentCount,
        absent: records.length - presentCount,
      });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
