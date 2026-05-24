const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET all members (with optional search)
router.get('/', authenticateToken, (req, res) => {
  const search = req.query.search || '';
  let members;
  if (search) {
    const like = `%${search}%`;
    members = db.prepare(`
      SELECT * FROM members
      WHERE name LIKE ? OR enrollment_no LIKE ? OR admission_no LIKE ?
      ORDER BY name ASC
    `).all(like, like, like);
  } else {
    members = db.prepare('SELECT * FROM members ORDER BY name ASC').all();
  }
  res.json(members);
});

// POST add member
router.post('/', authenticateToken, (req, res) => {
  const { name, course, year, enrollment_no, semester, admission_no } = req.body;
  if (!name || !course || !year || !enrollment_no || !semester || !admission_no)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const admissionNoUpper = admission_no.toUpperCase();

    const existingEnroll = db.prepare('SELECT id FROM members WHERE enrollment_no = ?').get(enrollment_no);
    if (existingEnroll) return res.status(409).json({ error: 'Enrollment No. already exists' });

    const existingAdm = db.prepare('SELECT id FROM members WHERE admission_no = ?').get(admissionNoUpper);
    if (existingAdm) return res.status(409).json({ error: 'Admission No. already exists' });

    const result = db.prepare(`
      INSERT INTO members (name, course, year, enrollment_no, semester, admission_no)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, course, year, enrollment_no, semester, admissionNoUpper);

    const newMember = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update member
router.put('/:id', authenticateToken, (req, res) => {
  const { name, course, year, enrollment_no, semester, admission_no } = req.body;
  const admissionNoUpper = admission_no.toUpperCase();
  try {
    db.prepare(`
      UPDATE members SET name=?, course=?, year=?, enrollment_no=?, semester=?, admission_no=?
      WHERE id=?
    `).run(name, course, year, enrollment_no, semester, admissionNoUpper, req.params.id);

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE member
router.delete('/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// POST bulk import
router.post('/import/bulk', authenticateToken, (req, res) => {
  const { members: membersList } = req.body;
  if (!Array.isArray(membersList) || membersList.length === 0)
    return res.status(400).json({ error: 'Members list is required and must not be empty' });

  const results = { success: 0, failed: 0, errors: [] };

  // Wrap entire bulk insert in a transaction — much faster and atomic
  const insertMany = db.transaction((list) => {
    const insertStmt = db.prepare(`
      INSERT INTO members (name, course, year, enrollment_no, semester, admission_no)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    list.forEach((m, i) => {
      if (!m.name) {
        results.failed++;
        results.errors.push({ row: i + 1, message: 'Name is required' });
        return;
      }
      try {
        if (m.enrollment_no) {
          const dup = db.prepare('SELECT id FROM members WHERE enrollment_no = ?').get(m.enrollment_no);
          if (dup) {
            results.failed++;
            results.errors.push({ row: i + 1, message: `Enrollment No. ${m.enrollment_no} already exists` });
            return;
          }
        }

        const admissionNoUpper = m.admission_no ? m.admission_no.toUpperCase() : '';
        if (admissionNoUpper) {
          const dup = db.prepare('SELECT id FROM members WHERE admission_no = ?').get(admissionNoUpper);
          if (dup) {
            results.failed++;
            results.errors.push({ row: i + 1, message: `Admission No. ${admissionNoUpper} already exists` });
            return;
          }
        }

        insertStmt.run(
          m.name,
          m.course || '',
          m.year || '',
          m.enrollment_no || '',
          m.semester || '',
          admissionNoUpper
        );
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 1, message: err.message });
      }
    });
  });

  insertMany(membersList);
  res.json(results);
});

module.exports = router;
