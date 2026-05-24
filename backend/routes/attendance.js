const express = require('express');
const { getDb, get, all, run } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.get('/sessions', authenticateToken, async (req, res) => {
  await getDb();
  const { date, event } = req.query;
  let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
  const params = [];
  if (date) { query += ' AND date = ?'; params.push(date); }
  if (event) { query += ' AND event_name LIKE ?'; params.push(`%${event}%`); }
  query += ' ORDER BY date DESC';
  res.json(all(query, params));
});

router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  await getDb();
  const session = get('SELECT * FROM attendance_sessions WHERE id = ?', [req.params.sessionId]);
  if (!session) return res.status(404).json({ error: 'Not found' });
  const records = all(`
    SELECT m.*, COALESCE(ar.present, 0) as present
    FROM members m
    LEFT JOIN attendance_records ar ON ar.member_id = m.id AND ar.session_id = ?
    ORDER BY m.name ASC
  `, [req.params.sessionId]);
  res.json({ session, records });
});

router.post('/save', authenticateToken, async (req, res) => {
  const { date, event_name, attendance } = req.body;
  if (!date || !event_name || !attendance) return res.status(400).json({ error: 'Missing fields' });

  await getDb();
  let session = get('SELECT * FROM attendance_sessions WHERE date = ? AND event_name = ?', [date, event_name]);
  if (!session) {
    run('INSERT INTO attendance_sessions (date, event_name) VALUES (?, ?)', [date, event_name]);
    session = get('SELECT * FROM attendance_sessions WHERE date = ? AND event_name = ?', [date, event_name]);
  }

  for (const record of attendance) {
    const existing = get('SELECT id FROM attendance_records WHERE session_id = ? AND member_id = ?', [session.id, record.member_id]);
    if (existing) {
      run('UPDATE attendance_records SET present = ? WHERE session_id = ? AND member_id = ?', [record.present ? 1 : 0, session.id, record.member_id]);
    } else {
      run('INSERT INTO attendance_records (session_id, member_id, present) VALUES (?, ?, ?)', [session.id, record.member_id, record.present ? 1 : 0]);
    }
  }

  res.json({ message: 'Attendance saved', session });
});

router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  await getDb();
  run('DELETE FROM attendance_records WHERE session_id = ?', [req.params.sessionId]);
  run('DELETE FROM attendance_sessions WHERE id = ?', [req.params.sessionId]);
  res.json({ message: 'Deleted' });
});

router.get('/report', authenticateToken, async (req, res) => {
  await getDb();
  const { date, event } = req.query;
  let query = 'SELECT * FROM attendance_sessions WHERE 1=1';
  const params = [];
  if (date) { query += ' AND date = ?'; params.push(date); }
  if (event) { query += ' AND event_name LIKE ?'; params.push(`%${event}%`); }
  query += ' ORDER BY date DESC';

  const sessions = all(query, params);
  const report = sessions.map(session => {
    const records = all(`
      SELECT m.name, m.enrollment_no, m.course, m.year, m.semester, m.admission_no, ar.present
      FROM attendance_records ar
      JOIN members m ON m.id = ar.member_id
      WHERE ar.session_id = ?
      ORDER BY m.name ASC
    `, [session.id]);
    const presentCount = records.filter(r => r.present == 1 || r.present === true).length;
    return { ...session, records, total: records.length, present: presentCount, absent: records.length - presentCount };
  });

  res.json(report);
});

module.exports = router;
