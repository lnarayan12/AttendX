require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'attendx.db');

// Open persistent SQLite file — no more in-memory loss on restart
const db = new Database(DB_PATH);

// Enable WAL mode: much faster writes, supports concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT DEFAULT 'admin',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS members (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    course        TEXT NOT NULL,
    year          TEXT NOT NULL,
    enrollment_no TEXT UNIQUE NOT NULL,
    semester      TEXT NOT NULL,
    admission_no  TEXT UNIQUE NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    event_name  TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    member_id  INTEGER NOT NULL,
    present    INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id)  REFERENCES members(id) ON DELETE CASCADE,
    UNIQUE(session_id, member_id)
  );
`);

// ── Seed default admin ────────────────────────────────────────────────────────
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existing) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashed, 'admin');
  console.log('✅ Default user created: admin / admin123');
}

console.log(`📁 Database: ${DB_PATH}`);

module.exports = db;
