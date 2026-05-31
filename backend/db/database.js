require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'attendx.db');

// Open persistent SQLite file
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log(`📁 Database: ${DB_PATH}`);
  initializeDatabase();
});

// Enable WAL mode for better concurrency (reads don't block writes)
db.run('PRAGMA journal_mode = WAL');
// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');
// Increase busy timeout so concurrent requests wait instead of failing
db.run('PRAGMA busy_timeout = 5000');

// ── Helper wrapper functions ────────────────────────────────────────────────────
const prepare = (sql) => ({
  run: (...params) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params.flat(), function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get: (...params) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params.flat(), (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (...params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params.flat(), (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
});

// ── Schema ────────────────────────────────────────────────────────────────────
function initializeDatabase() {
  // Run all schema statements in a serialized block, then exit serialize mode
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        username    TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT DEFAULT 'admin',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS members (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        course        TEXT NOT NULL,
        year          TEXT NOT NULL,
        enrollment_no TEXT UNIQUE NOT NULL,
        semester      TEXT NOT NULL,
        admission_no  TEXT UNIQUE NOT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT NOT NULL,
        event_name  TEXT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        member_id  INTEGER NOT NULL,
        present    INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id)  REFERENCES members(id) ON DELETE CASCADE,
        UNIQUE(session_id, member_id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        date        TEXT NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS event_members (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id  INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
        UNIQUE(event_id, member_id)
      )
    `);

    // Clean up any existing floating-point formatted numbers in members table
    db.run("UPDATE members SET enrollment_no = SUBSTR(enrollment_no, 1, LENGTH(enrollment_no) - 2) WHERE enrollment_no LIKE '%.0'");
    db.run("UPDATE members SET admission_no = SUBSTR(admission_no, 1, LENGTH(admission_no) - 2) WHERE admission_no LIKE '%.0'");

    // Seed default admin — last statement in serialize block
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) { console.error('Seed check failed:', err); return; }
      if (!row) {
        const hashed = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          ['admin', hashed, 'admin'],
          () => console.log('✅ Default user created: admin / admin123')
        );
      }
      // ── All initialization done — log ready ──────────────────────────────────
      console.log('✅ Database initialized and ready');
    });
  });
  // After db.serialize() returns, the connection is back in parallel mode.
  // All subsequent API queries will run without being queued behind schema setup.
}

module.exports = { db, prepare };
