const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'attendance.db.json');

let db = null;
let SQL = null;

// Persist db to file as binary
function persistDb() {
  if (db) {
    const data = db.export();
    const buf = Buffer.from(data);
    fs.writeFileSync(DB_PATH.replace('.json', ''), buf);
  }
}

async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();
  const dbFile = DB_PATH.replace('.json', '');
  
  if (fs.existsSync(dbFile)) {
    const fileBuffer = fs.readFileSync(dbFile);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initializeSchema();
  return db;
}

function run(sql, params = []) {
  db.run(sql, params);
  persistDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function exec(sql) {
  db.run(sql);
  persistDb();
}

function initializeSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      course TEXT NOT NULL,
      year TEXT NOT NULL,
      enrollment_no TEXT UNIQUE NOT NULL,
      semester TEXT NOT NULL,
      admission_no TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      event_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      present INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
      FOREIGN KEY (member_id) REFERENCES members(id),
      UNIQUE(session_id, member_id)
    )
  `);

  const bcrypt = require('bcryptjs');
  const existing = get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!existing) {
    const hashed = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashed, 'admin']);
    persistDb();
    console.log('Default user created: admin / admin123');
  }
}

module.exports = { getDb, run, get, all, exec, persistDb };
