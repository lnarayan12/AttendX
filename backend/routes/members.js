const express = require('express');
const { prepare } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET all members (with optional search)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search || '';
    let members;
    if (search) {
      const like = `%${search}%`;
      members = await prepare(`
        SELECT * FROM members
        WHERE name LIKE ? OR enrollment_no LIKE ? OR admission_no LIKE ?
        ORDER BY name ASC
      `).all(like, like, like);
    } else {
      members = await prepare('SELECT * FROM members ORDER BY name ASC').all();
    }
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add member
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, course, year, enrollment_no, semester, admission_no } = req.body;
    if (!name || !course || !year || !enrollment_no || !semester || !admission_no)
      return res.status(400).json({ error: 'All fields are required' });

    const admissionNoUpper = admission_no.toUpperCase();

    const existingEnroll = await prepare('SELECT id FROM members WHERE enrollment_no = ?').get(enrollment_no);
    if (existingEnroll) return res.status(409).json({ error: 'Enrollment No. already exists' });

    const existingAdm = await prepare('SELECT id FROM members WHERE admission_no = ?').get(admissionNoUpper);
    if (existingAdm) return res.status(409).json({ error: 'Admission No. already exists' });

    const result = await prepare(`
      INSERT INTO members (name, course, year, enrollment_no, semester, admission_no)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, course, year, enrollment_no, semester, admissionNoUpper);

    const newMember = await prepare('SELECT * FROM members WHERE id = ?').get(result.lastID);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update member
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, course, year, enrollment_no, semester, admission_no } = req.body;
    if (!name || !course || !year || !enrollment_no || !semester || !admission_no)
      return res.status(400).json({ error: 'All fields are required' });

    const memberId = req.params.id;
    const admissionNoUpper = admission_no.toUpperCase();

    // Check if enrollment_no already exists (excluding current member)
    const existingEnroll = await prepare('SELECT id FROM members WHERE enrollment_no = ? AND id != ?').get(enrollment_no, memberId);
    if (existingEnroll) return res.status(409).json({ error: 'Enrollment No. already exists' });

    // Check if admission_no already exists (excluding current member)
    const existingAdm = await prepare('SELECT id FROM members WHERE admission_no = ? AND id != ?').get(admissionNoUpper, memberId);
    if (existingAdm) return res.status(409).json({ error: 'Admission No. already exists' });

    await prepare(`
      UPDATE members SET name=?, course=?, year=?, enrollment_no=?, semester=?, admission_no=?
      WHERE id=?
    `).run(name, course, year, enrollment_no, semester, admissionNoUpper, memberId);

    const updated = await prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE member
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk import
router.post('/import/bulk', authenticateToken, async (req, res) => {
  try {
    const { members: membersList } = req.body;
    if (!Array.isArray(membersList) || membersList.length === 0)
      return res.status(400).json({ error: 'Members list is required and must not be empty' });

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < membersList.length; i++) {
      const m = membersList[i];
      if (!m.name || !m.enrollment_no || !m.admission_no) {
        results.failed++;
        results.errors.push({ row: i + 1, message: 'Name, Enrollment No., and Admission No. are required' });
        continue;
      }
      try {
        if (m.enrollment_no) {
          const dup = await prepare('SELECT id FROM members WHERE enrollment_no = ?').get(m.enrollment_no);
          if (dup) {
            results.failed++;
            results.errors.push({ row: i + 1, message: `Enrollment No. ${m.enrollment_no} already exists` });
            continue;
          }
        }

        const admissionNoUpper = m.admission_no ? m.admission_no.toUpperCase() : '';
        if (admissionNoUpper) {
          const dup = await prepare('SELECT id FROM members WHERE admission_no = ?').get(admissionNoUpper);
          if (dup) {
            results.failed++;
            results.errors.push({ row: i + 1, message: `Admission No. ${admissionNoUpper} already exists` });
            continue;
          }
        }

        await prepare(`
          INSERT INTO members (name, course, year, enrollment_no, semester, admission_no)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
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
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
