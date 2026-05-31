const express = require('express');
const { prepare } = require('../db/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get all events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const events = await prepare(`
      SELECT e.*, COUNT(em.member_id) AS memberCount
      FROM events e
      LEFT JOIN event_members em ON e.id = em.event_id
      GROUP BY e.id
      ORDER BY e.date DESC
    `).all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get events for a specific date
router.get('/by-date/:date', authenticateToken, async (req, res) => {
  try {
    const events = await prepare('SELECT * FROM events WHERE date = ? ORDER BY name ASC').all(req.params.date);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get event details with assigned members
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const members = await prepare(
      `SELECT m.* FROM members m
       INNER JOIN event_members em ON m.id = em.member_id
       WHERE em.event_id = ?
       ORDER BY m.name ASC`
    ).all(req.params.id);

    res.json({ ...event, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, date, memberIds } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Event name and date are required' });
    }

    // Check if event already exists
    const existing = await prepare('SELECT id FROM events WHERE name = ? AND date = ?').get(name, date);
    if (existing) {
      return res.status(409).json({ error: 'Event already exists for this date' });
    }

    // Create event
    const result = await prepare('INSERT INTO events (name, date) VALUES (?, ?)').run(name, date);
    const event = await prepare('SELECT * FROM events WHERE id = ?').get(result.lastID);

    // Assign members if provided
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await prepare('INSERT OR IGNORE INTO event_members (event_id, member_id) VALUES (?, ?)').run(event.id, memberId);
      }
    }

    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event (name and assigned members)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, memberIds } = req.body;

    const event = await prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Update event name
    if (name) {
      await prepare('UPDATE events SET name = ? WHERE id = ?').run(name, req.params.id);
    }

    // Update members
    if (Array.isArray(memberIds)) {
      // Remove all existing members
      await prepare('DELETE FROM event_members WHERE event_id = ?').run(req.params.id);
      
      // Add new members
      for (const memberId of memberIds) {
        await prepare('INSERT OR IGNORE INTO event_members (event_id, member_id) VALUES (?, ?)').run(req.params.id, memberId);
      }
    }

    const updatedEvent = await prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prepare('DELETE FROM event_members WHERE event_id = ?').run(req.params.id);
    await prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
