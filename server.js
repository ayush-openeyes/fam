const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.db');

app.use(express.json({ limit: '1mb' }));
app.use(express.static('.'));

let db = null;
let SQL = null;

function openDb() {
  if (db) return db;
  try {
    const buf = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buf);
  } catch (e) {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS tiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT, name TEXT, email TEXT, tier TEXT, cost TEXT, expires_at TEXT, renews_auto INTEGER DEFAULT 1, preferences TEXT DEFAULT '[]', notes TEXT DEFAULT '', "order" INTEGER DEFAULT 0, hourly_enabled INTEGER DEFAULT 0, hourly_label TEXT DEFAULT '', hourly_interval_mins INTEGER, hourly_cost_per_cycle TEXT DEFAULT '', hourly_anchor TEXT DEFAULT '', FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tiles_user ON tiles(user_id)`);
  saveDb();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buf = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buf);
}

function rowToUser(row) {
  return { id: row.id, name: row.name, color: row.color };
}

function rowToTile(row) {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider || 'custom',
    name: row.name,
    email: row.email,
    tier: row.tier,
    cost: row.cost,
    expiresAt: row.expires_at,
    renewsAuto: !!row.renews_auto,
    preferences: JSON.parse(row.preferences || '[]'),
    notes: row.notes || '',
    order: row.order,
    hourly: {
      enabled: !!row.hourly_enabled,
      label: row.hourly_label,
      intervalMins: row.hourly_interval_mins,
      costPerCycle: row.hourly_cost_per_cycle,
      anchor: row.hourly_anchor,
    },
  };
}

initSqlJs().then(SQL => {
  SQL = SQL;
  openDb();
  app.listen(PORT, () => console.log(`Signal Room running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to load sql.js:', err);
  process.exit(1);
});

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function seed() {
  const d = (n) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().split('T')[0];
  };
  const anchor = (minsAgo) => {
    const x = new Date(Date.now() - minsAgo * 60000);
    return x.toISOString().slice(0, 16);
  };
  const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const users = [
    { id: 'u1', name: 'Shakti', color: '#c05740' },
    { id: 'u2', name: 'Ayush Rajput', color: '#1a5fa0' },
    { id: 'u3', name: 'Hethvi Kothari', color: '#2a7a5e' },
  ];
  const tiles = [
    { id: makeId(), user_id: 'u1', provider: 'anthropic', name: 'Claude Pro', email: 'shakti@studio.io', tier: 'Pro', cost: '$20/mo', expires_at: d(47), renews_auto: 1, preferences: JSON.stringify(['coding','writing','research']), notes: 'Primary creative account.', order: 0, hourly_enabled: 1, hourly_label: 'Message rate limit', hourly_interval_mins: 60, hourly_cost_per_cycle: '', hourly_anchor: anchor(22) },
    { id: makeId(), user_id: 'u1', provider: 'openai', name: 'ChatGPT Plus', email: 'shakti@studio.io', tier: 'Plus', cost: '$20/mo', expires_at: d(6), renews_auto: 0, preferences: JSON.stringify(['vision','analysis']), notes: '', order: 1, hourly_enabled: 1, hourly_label: 'GPT-4 quota window', hourly_interval_mins: 180, hourly_cost_per_cycle: '', hourly_anchor: anchor(55) },
    { id: makeId(), user_id: 'u1', provider: 'perplexity', name: 'Perplexity Pro', email: 'shakti@studio.io', tier: 'Pro', cost: '$20/mo', expires_at: d(-10), renews_auto: 0, preferences: JSON.stringify(['search','news']), notes: 'Expired.', order: 2, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
    { id: makeId(), user_id: 'u2', provider: 'openai', name: 'ChatGPT Team', email: 'ayush@company.com', tier: 'Team', cost: '$25/mo', expires_at: d(22), renews_auto: 1, preferences: JSON.stringify(['analysis','docs']), notes: 'Team workspace.', order: 0, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
    { id: makeId(), user_id: 'u2', provider: 'microsoft', name: 'Copilot Business', email: 'ayush@company.com', tier: 'Business', cost: '$30/mo', expires_at: d(58), renews_auto: 1, preferences: JSON.stringify(['office','docs']), notes: '', order: 1, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
    { id: makeId(), user_id: 'u2', provider: 'google', name: 'Gemini Advanced', email: 'work@company.com', tier: 'Advanced', cost: '$19.99/mo', expires_at: d(14), renews_auto: 1, preferences: JSON.stringify(['multimodal','code']), notes: '', order: 2, hourly_enabled: 1, hourly_label: 'Gemini Pro calls', hourly_interval_mins: 60, hourly_cost_per_cycle: '$0.002', hourly_anchor: anchor(41) },
    { id: makeId(), user_id: 'u3', provider: 'groq', name: 'Groq API', email: 'hethvi@gmail.com', tier: 'Paid', cost: '$0.06/1K', expires_at: d(90), renews_auto: 1, preferences: JSON.stringify(['speed','inference']), notes: 'Prepaid credits.', order: 0, hourly_enabled: 1, hourly_label: 'Burst limit window', hourly_interval_mins: 30, hourly_cost_per_cycle: '', hourly_anchor: anchor(8) },
    { id: makeId(), user_id: 'u3', provider: 'mistral', name: 'Mistral API', email: 'hethvi@gmail.com', tier: 'Pay-as-go', cost: '€8/mo', expires_at: d(120), renews_auto: 1, preferences: JSON.stringify(['EU-hosted']), notes: '', order: 1, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
  ];
  const stmtU = db.prepare('INSERT OR REPLACE INTO users (id, name, color) VALUES (?, ?, ?)');
  const stmtT = db.prepare('INSERT OR REPLACE INTO tiles (id, user_id, provider, name, email, tier, cost, expires_at, renews_auto, preferences, notes, "order", hourly_enabled, hourly_label, hourly_interval_mins, hourly_cost_per_cycle, hourly_anchor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const u of users) stmtU.run([u.id, u.name, u.color]);
  for (const t of tiles) stmtT.run([t.id, t.user_id, t.provider, t.name, t.email, t.tier, t.cost, t.expires_at, t.renews_auto, t.preferences, t.notes, t.order, t.hourly_enabled, t.hourly_label, t.hourly_interval_mins, t.hourly_cost_per_cycle, t.hourly_anchor]);
  saveDb();
}

app.get('/api/users', (req, res) => {
  db = openDb();
  const rows = db.exec('SELECT * FROM users ORDER BY id');
  const users = rows[0] ? rows[0].values.map(r => rowToUser({ id: r[0], name: r[1], color: r[2] })) : [];
  const tileRows = db.exec('SELECT * FROM tiles');
  const tiles = tileRows[0] ? tileRows[0].values.map(r => rowToTile({
    id: r[0], user_id: r[1], provider: r[2], name: r[3], email: r[4], tier: r[5], cost: r[6], expires_at: r[7], renews_auto: r[8], preferences: r[9], notes: r[10], order: r[11], hourly_enabled: r[12], hourly_label: r[13], hourly_interval_mins: r[14], hourly_cost_per_cycle: r[15], hourly_anchor: r[16],
  })) : [];
  const byUser = {};
  for (const t of tiles) {
    (byUser[t.userId] = byUser[t.userId] || []).push(t);
  }
  res.json({ users, byUser, activeUserId: users[0]?.id || null });
});

app.get('/api/users/:userId/tiles', (req, res) => {
  db = openDb();
  const rows = db.exec('SELECT * FROM tiles WHERE user_id = ? ORDER BY "order"', [req.params.userId]);
  const tiles = rows[0] ? rows[0].values.map(r => rowToTile({
    id: r[0], user_id: r[1], provider: r[2], name: r[3], email: r[4], tier: r[5], cost: r[6], expires_at: r[7], renews_auto: r[8], preferences: r[9], notes: r[10], order: r[11], hourly_enabled: r[12], hourly_label: r[13], hourly_interval_mins: r[14], hourly_cost_per_cycle: r[15], hourly_anchor: r[16],
  })) : [];
  res.json({ tiles });
});

app.post('/api/users', (req, res) => {
  db = openDb();
  const body = req.body || {};
  if (!body.id || !body.name) return res.status(400).json({ error: 'id and name required' });
  db.run('INSERT OR REPLACE INTO users (id, name, color) VALUES (?, ?, ?)', [body.id, body.name, body.color || '#888']);
  saveDb();
  res.status(201).json(rowToUser({ id: body.id, name: body.name, color: body.color || '#888' }));
});

app.put('/api/users/:id', (req, res) => {
  db = openDb();
  const { id } = req.params;
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'name required' });
  db.run('INSERT OR REPLACE INTO users (id, name, color) VALUES (?, ?, COALESCE((SELECT color FROM users WHERE id=?), ?))', [id, body.name, id, body.color]);
  saveDb();
  const rows = db.exec('SELECT * FROM users WHERE id = ?', [id]);
  const row = rows[0] && rows[0].values[0];
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(rowToUser({ id: row[0], name: row[1], color: row[2] }));
});

app.delete('/api/users/:id', (req, res) => {
  db = openDb();
  const { id } = req.params;
  db.run('DELETE FROM tiles WHERE user_id = ?', [id]);
  db.run('DELETE FROM users WHERE id = ?', [id]);
  saveDb();
  res.status(204).end();
});

app.post('/api/tiles', (req, res) => {
  db = openDb();
  const body = req.body || {};
  if (!body.id || !body.userId) return res.status(400).json({ error: 'id and userId required' });
  const tile = {
    id: body.id, user_id: body.userId, provider: body.provider || 'custom', name: body.name || '', email: body.email || '', tier: body.tier || '', cost: body.cost || '', expires_at: body.expiresAt || null,
    renews_auto: body.renewsAuto ? 1 : 0, preferences: JSON.stringify(body.preferences || []), notes: body.notes || '', order: typeof body.order === 'number' ? body.order : 0,
    hourly_enabled: body.hourly && body.hourly.enabled ? 1 : 0, hourly_label: (body.hourly && body.hourly.label) || '', hourly_interval_mins: (body.hourly && body.hourly.intervalMins) || null, hourly_cost_per_cycle: (body.hourly && body.hourly.costPerCycle) || '', hourly_anchor: (body.hourly && body.hourly.anchor) || '',
  };
  db.run('INSERT OR REPLACE INTO tiles (id, user_id, provider, name, email, tier, cost, expires_at, renews_auto, preferences, notes, "order", hourly_enabled, hourly_label, hourly_interval_mins, hourly_cost_per_cycle, hourly_anchor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tile.id, tile.user_id, tile.provider, tile.name, tile.email, tile.tier, tile.cost, tile.expires_at, tile.renews_auto, tile.preferences, tile.notes, tile.order, tile.hourly_enabled, tile.hourly_label, tile.hourly_interval_mins, tile.hourly_cost_per_cycle, tile.hourly_anchor]);
  saveDb();
  res.status(201).json(rowToTile(tile));
});

app.put('/api/tiles/:id', (req, res) => {
  db = openDb();
  const { id } = req.params;
  const body = req.body || {};
  const existingRows = db.exec('SELECT * FROM tiles WHERE id = ?', [id]);
  const existing = existingRows[0] ? existingRows[0].values[0] : null;
  if (!existing) return res.status(404).json({ error: 'not found' });
  const existingObj = {
    id: existing[0], user_id: existing[1], provider: existing[2], name: existing[3], email: existing[4], tier: existing[5], cost: existing[6], expires_at: existing[7], renews_auto: existing[8], preferences: existing[9], notes: existing[10], order: existing[11], hourly_enabled: existing[12], hourly_label: existing[13], hourly_interval_mins: existing[14], hourly_cost_per_cycle: existing[15], hourly_anchor: existing[16],
  };
  const tile = {
    id, user_id: body.userId || existingObj.user_id, provider: body.provider ?? existingObj.provider, name: body.name ?? existingObj.name, email: body.email ?? existingObj.email, tier: body.tier ?? existingObj.tier, cost: body.cost ?? existingObj.cost,
    expires_at: body.expiresAt ?? existingObj.expires_at, renews_auto: typeof body.renewsAuto === 'boolean' ? (body.renewsAuto ? 1 : 0) : existingObj.renews_auto,
    preferences: JSON.stringify(body.preferences ?? JSON.parse(existingObj.preferences || '[]')), notes: body.notes ?? existingObj.notes, order: typeof body.order === 'number' ? body.order : existingObj.order,
    hourly_enabled: ((body.hourly && typeof body.hourly.enabled === 'boolean') ? (body.hourly.enabled ? 1 : 0) : existingObj.hourly_enabled),
    hourly_label: (body.hourly && body.hourly.label) ?? existingObj.hourly_label, hourly_interval_mins: (body.hourly && body.hourly.intervalMins) ?? existingObj.hourly_interval_mins, hourly_cost_per_cycle: (body.hourly && body.hourly.costPerCycle) ?? existingObj.hourly_cost_per_cycle, hourly_anchor: (body.hourly && body.hourly.anchor) ?? existingObj.hourly_anchor,
  };
  db.run('INSERT OR REPLACE INTO tiles (id, user_id, provider, name, email, tier, cost, expires_at, renews_auto, preferences, notes, "order", hourly_enabled, hourly_label, hourly_interval_mins, hourly_cost_per_cycle, hourly_anchor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tile.id, tile.user_id, tile.provider, tile.name, tile.email, tile.tier, tile.cost, tile.expires_at, tile.renews_auto, tile.preferences, tile.notes, tile.order, tile.hourly_enabled, tile.hourly_label, tile.hourly_interval_mins, tile.hourly_cost_per_cycle, tile.hourly_anchor]);
  saveDb();
  res.json(rowToTile(tile));
});

app.delete('/api/tiles/:id', (req, res) => {
  db = openDb();
  db.run('DELETE FROM tiles WHERE id = ?', [req.params.id]);
  saveDb();
  res.status(204).end();
});

app.put('/api/tiles/reorder', (req, res) => {
  db = openDb();
  const updates = req.body && req.body.updates;
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });
  for (const u of updates) {
    db.run('UPDATE tiles SET "order" = ? WHERE id = ?', [u.order, u.id]);
  }
  saveDb();
  res.json({ ok: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});
