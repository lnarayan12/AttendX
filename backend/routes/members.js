const express = require('express');
const { getDb, get, all, run } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  await getDb();
  const search = req.query.search || '';
  let members;
  if (search) {
    members = all(`SELECT * FROM members WHERE name LIKE ? OR enrollment_no LIKE ? OR admission_no LIKE ? ORDER BY name ASC`,
      [`%${search}%`, `%${search}%`, `%${search}%`]);
  } else {
    members = all('SELECT * FROM members ORDER BY name ASC');
  }
  res.json(members);
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, course, year, enrollment_no, semester, admission_no } = req.body;
  if (!name || !course || !year || !enrollment_no || !semester || !admission_no)
    return res.status(400).json({ error: 'All fields are required' });

  await getDb();
  try {
    const existing_enroll = get('SELECT id FROM members WHERE enrollment_no = ?', [enrollment_no]);
    if (existing_enroll) return res.status(409).json({ error: 'Enrollment No. already exists' });
    const admissionNoUpper = admission_no.toUpperCase();
    const existing_adm = get('SELECT id FROM members WHERE admission_no = ?', [admissionNoUpper]);
    if (existing_adm) return res.status(409).json({ error: 'Admission No. already exists' });

    const { db, persistDb } = require('../db/database');
    // Use raw db for lastInsertRowid
    const dbInstance = await getDb();
    run('INSERT INTO members (name,course,year,enrollment_no,semester,admission_no) VALUES (?,?,?,?,?,?)',
      [name, course, year, enrollment_no, semester, admissionNoUpper]);
    const newMember = get('SELECT * FROM members WHERE enrollment_no = ?', [enrollment_no]);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { name, course, year, enrollment_no, semester, admission_no } = req.body;
  const admissionNoUpper = admission_no.toUpperCase();
  await getDb();
  run('UPDATE members SET name=?,course=?,year=?,enrollment_no=?,semester=?,admission_no=? WHERE id=?',
    [name, course, year, enrollment_no, semester, admissionNoUpper, req.params.id]);
  res.json(get('SELECT * FROM members WHERE id = ?', [req.params.id]));
});

router.delete('/:id', authenticateToken, async (req, res) => {
  await getDb();
  run('DELETE FROM members WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

router.post('/import/bulk', authenticateToken, async (req, res) => {
  const { members: membersList } = req.body;
  
  if (!Array.isArray(membersList) || membersList.length === 0) {
    return res.status(400).json({ error: 'Members list is required and must not be empty' });
  }

  await getDb();
  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < membersList.length; i++) {
    const m = membersList[i];
    
    // Validate only required field: name
    if (!m.name) {
      results.failed++;
      results.errors.push({ row: i + 1, message: 'Name is required' });
      continue;
    }

    try {
      // Check for duplicates only if enrollment_no is provided
      if (m.enrollment_no) {
        const existing_enroll = get('SELECT id FROM members WHERE enrollment_no = ?', [m.enrollment_no]);
        if (existing_enroll) {
          results.failed++;
          results.errors.push({ row: i + 1, message: `Enrollment No. ${m.enrollment_no} already exists` });
          continue;
        }
      }

      // Check for duplicates only if admission_no is provided
      let admissionNoUpper = '';
      if (m.admission_no) {
        admissionNoUpper = m.admission_no.toUpperCase();
        const existing_adm = get('SELECT id FROM members WHERE admission_no = ?', [admissionNoUpper]);
        if (existing_adm) {
          results.failed++;
          results.errors.push({ row: i + 1, message: `Admission No. ${admissionNoUpper} already exists` });
          continue;
        }
      }

      // Optional fields can be blank
      const course = m.course || '';
      const year = m.year || '';
      const semester = m.semester || '';
      const enrollment_no = m.enrollment_no || '';

      run('INSERT INTO members (name,course,year,enrollment_no,semester,admission_no) VALUES (?,?,?,?,?,?)',
        [m.name, course, year, enrollment_no, semester, admissionNoUpper]);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ row: i + 1, message: err.message });
    }
  }

  res.json(results);
});

module.exports = router;
