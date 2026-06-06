require('dotenv').config();

const { createClient } = require('@libsql/client');
const os = require('os');
const path = require('path');

let client = null;
let ready = null;

function getDbMode() {
  if (process.env.TURSO_DATABASE_URL) return 'turso';
  if (process.env.LIBSQL_URL) return 'libsql';
  if (process.env.VERCEL) return 'vercel-tmp';
  return 'local-file';
}

function getDbUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.LIBSQL_URL) return process.env.LIBSQL_URL;
  if (process.env.VERCEL) {
    const file = path.join(os.tmpdir(), 'signal-room.db').replace(/\\/g, '/');
    return `file:${file}`;
  }
  return 'file:data.db';
}

function getClient() {
  if (!client) {
    client = createClient({
      url: getDbUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function ensureSchema() {
  const db = getClient();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT,
      name TEXT,
      email TEXT,
      tier TEXT,
      cost TEXT,
      expires_at TEXT,
      renews_auto INTEGER DEFAULT 1,
      preferences TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      "order" INTEGER DEFAULT 0,
      hourly_enabled INTEGER DEFAULT 0,
      hourly_label TEXT DEFAULT '',
      hourly_interval_mins INTEGER,
      hourly_cost_per_cycle TEXT DEFAULT '',
      hourly_anchor TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tiles_user ON tiles(user_id)`,
  ], 'write');
}

async function init() {
  if (!ready) ready = ensureSchema();
  await ready;
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
      label: row.hourly_label || '',
      intervalMins: row.hourly_interval_mins,
      costPerCycle: row.hourly_cost_per_cycle || '',
      anchor: row.hourly_anchor || '',
    },
  };
}

function tileToRow(body, existing) {
  const hourly = body.hourly || {};
  const exHourly = existing?.hourly || {};
  return {
    id: body.id || existing?.id,
    user_id: body.userId || existing?.user_id,
    provider: body.provider ?? existing?.provider ?? 'custom',
    name: body.name ?? existing?.name ?? '',
    email: body.email ?? existing?.email ?? '',
    tier: body.tier ?? existing?.tier ?? '',
    cost: body.cost ?? existing?.cost ?? '',
    expires_at: body.expiresAt ?? existing?.expires_at ?? null,
    renews_auto: typeof body.renewsAuto === 'boolean'
      ? (body.renewsAuto ? 1 : 0)
      : (existing?.renews_auto ?? 1),
    preferences: JSON.stringify(body.preferences ?? JSON.parse(existing?.preferences || '[]')),
    notes: body.notes ?? existing?.notes ?? '',
    order: typeof body.order === 'number' ? body.order : (existing?.order ?? 0),
    hourly_enabled: typeof hourly.enabled === 'boolean'
      ? (hourly.enabled ? 1 : 0)
      : (existing?.hourly_enabled ?? 0),
    hourly_label: hourly.label ?? existing?.hourly_label ?? '',
    hourly_interval_mins: hourly.intervalMins ?? existing?.hourly_interval_mins ?? null,
    hourly_cost_per_cycle: hourly.costPerCycle ?? existing?.hourly_cost_per_cycle ?? '',
    hourly_anchor: hourly.anchor ?? existing?.hourly_anchor ?? '',
  };
}

const INSERT_TILE = `INSERT OR REPLACE INTO tiles (
  id, user_id, provider, name, email, tier, cost, expires_at, renews_auto,
  preferences, notes, "order", hourly_enabled, hourly_label,
  hourly_interval_mins, hourly_cost_per_cycle, hourly_anchor
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

async function upsertTileRow(tile) {
  await getClient().execute({
    sql: INSERT_TILE,
    args: [
      tile.id, tile.user_id, tile.provider, tile.name, tile.email, tile.tier,
      tile.cost, tile.expires_at, tile.renews_auto, tile.preferences, tile.notes,
      tile.order, tile.hourly_enabled, tile.hourly_label, tile.hourly_interval_mins,
      tile.hourly_cost_per_cycle, tile.hourly_anchor,
    ],
  });
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function seedIfEmpty() {
  const { rows } = await getClient().execute('SELECT COUNT(*) AS n FROM users');
  if (Number(rows[0].n) > 0) return;

  const d = (n) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().split('T')[0];
  };
  const anchor = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString().slice(0, 16);

  const users = [
    { id: 'u1', name: 'Shakti', color: '#c05740' },
    { id: 'u2', name: 'Ayush Rajput', color: '#1a5fa0' },
    { id: 'u3', name: 'Hethvi Kothari', color: '#2a7a5e' },
  ];

  const tiles = [
    { user_id: 'u1', provider: 'anthropic', name: 'Claude Pro', email: 'shakti@studio.io', tier: 'Pro', cost: '$20/mo', expires_at: d(47), renews_auto: 1, preferences: JSON.stringify(['coding', 'writing', 'research']), notes: 'Primary creative account.', order: 0, hourly_enabled: 1, hourly_label: 'Message rate limit', hourly_interval_mins: 60, hourly_cost_per_cycle: '', hourly_anchor: anchor(22) },
    { user_id: 'u1', provider: 'openai', name: 'ChatGPT Plus', email: 'shakti@studio.io', tier: 'Plus', cost: '$20/mo', expires_at: d(6), renews_auto: 0, preferences: JSON.stringify(['vision', 'analysis']), notes: '', order: 1, hourly_enabled: 1, hourly_label: 'GPT-4 quota window', hourly_interval_mins: 180, hourly_cost_per_cycle: '', hourly_anchor: anchor(55) },
    { user_id: 'u1', provider: 'perplexity', name: 'Perplexity Pro', email: 'shakti@studio.io', tier: 'Pro', cost: '$20/mo', expires_at: d(-10), renews_auto: 0, preferences: JSON.stringify(['search', 'news']), notes: 'Expired.', order: 2, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
    { user_id: 'u2', provider: 'openai', name: 'ChatGPT Team', email: 'ayush@company.com', tier: 'Team', cost: '$25/mo', expires_at: d(22), renews_auto: 1, preferences: JSON.stringify(['analysis', 'docs']), notes: 'Team workspace.', order: 0, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
    { user_id: 'u2', provider: 'microsoft', name: 'Copilot Business', email: 'ayush@company.com', tier: 'Business', cost: '$30/mo', expires_at: d(58), renews_auto: 1, preferences: JSON.stringify(['office', 'docs']), notes: '', order: 1, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
    { user_id: 'u2', provider: 'google', name: 'Gemini Advanced', email: 'work@company.com', tier: 'Advanced', cost: '$19.99/mo', expires_at: d(14), renews_auto: 1, preferences: JSON.stringify(['multimodal', 'code']), notes: '', order: 2, hourly_enabled: 1, hourly_label: 'Gemini Pro calls', hourly_interval_mins: 60, hourly_cost_per_cycle: '$0.002', hourly_anchor: anchor(41) },
    { user_id: 'u3', provider: 'groq', name: 'Groq API', email: 'hethvi@gmail.com', tier: 'Paid', cost: '$0.06/1K', expires_at: d(90), renews_auto: 1, preferences: JSON.stringify(['speed', 'inference']), notes: 'Prepaid credits.', order: 0, hourly_enabled: 1, hourly_label: 'Burst limit window', hourly_interval_mins: 30, hourly_cost_per_cycle: '', hourly_anchor: anchor(8) },
    { user_id: 'u3', provider: 'mistral', name: 'Mistral API', email: 'hethvi@gmail.com', tier: 'Pay-as-go', cost: '€8/mo', expires_at: d(120), renews_auto: 1, preferences: JSON.stringify(['EU-hosted']), notes: '', order: 1, hourly_enabled: 0, hourly_label: '', hourly_interval_mins: null, hourly_cost_per_cycle: '', hourly_anchor: '' },
  ];

  const db = getClient();
  for (const u of users) {
    await db.execute({
      sql: 'INSERT INTO users (id, name, color) VALUES (?, ?, ?)',
      args: [u.id, u.name, u.color],
    });
  }
  for (const t of tiles) {
    await upsertTileRow({ id: makeId(), ...t });
  }
}

async function getUsersPayload() {
  await init();
  await seedIfEmpty();

  const db = getClient();
  const { rows: userRows } = await db.execute('SELECT * FROM users ORDER BY id');
  const { rows: tileRows } = await db.execute('SELECT * FROM tiles ORDER BY "order"');

  const users = userRows.map(rowToUser);
  const byUser = {};
  for (const row of tileRows) {
    const tile = rowToTile(row);
    const { userId, ...rest } = tile;
    (byUser[userId] = byUser[userId] || []).push(rest);
  }

  return { users, byUser, activeUserId: users[0]?.id || null };
}

async function createUser(body) {
  await init();
  if (!body?.id || !body?.name) throw Object.assign(new Error('id and name required'), { status: 400 });
  const color = body.color || '#888';
  await getClient().execute({
    sql: 'INSERT OR REPLACE INTO users (id, name, color) VALUES (?, ?, ?)',
    args: [body.id, body.name, color],
  });
  return rowToUser({ id: body.id, name: body.name, color });
}

async function updateUser(id, body) {
  await init();
  if (!body?.name) throw Object.assign(new Error('name required'), { status: 400 });
  const db = getClient();
  const { rows } = await db.execute({ sql: 'SELECT color FROM users WHERE id = ?', args: [id] });
  const color = body.color || rows[0]?.color || '#888';
  await db.execute({
    sql: 'INSERT OR REPLACE INTO users (id, name, color) VALUES (?, ?, ?)',
    args: [id, body.name, color],
  });
  return rowToUser({ id, name: body.name, color });
}

async function deleteUser(id) {
  await init();
  const db = getClient();
  await db.batch([
    { sql: 'DELETE FROM tiles WHERE user_id = ?', args: [id] },
    { sql: 'DELETE FROM users WHERE id = ?', args: [id] },
  ], 'write');
}

async function createTile(body) {
  await init();
  if (!body?.id) throw Object.assign(new Error('id required'), { status: 400 });
  if (!body?.userId) throw Object.assign(new Error('userId required'), { status: 400 });
  const tile = tileToRow(body);
  await upsertTileRow(tile);
  return rowToTile(tile);
}

async function updateTile(id, body) {
  await init();
  const db = getClient();
  const { rows } = await db.execute({ sql: 'SELECT * FROM tiles WHERE id = ?', args: [id] });
  if (!rows[0]) throw Object.assign(new Error('not found'), { status: 404 });
  const tile = tileToRow({ ...body, id }, rows[0]);
  await upsertTileRow(tile);
  return rowToTile(tile);
}

async function deleteTile(id) {
  await init();
  await getClient().execute({ sql: 'DELETE FROM tiles WHERE id = ?', args: [id] });
}

async function reorderTiles(updates) {
  await init();
  if (!Array.isArray(updates)) throw Object.assign(new Error('updates array required'), { status: 400 });
  const db = getClient();
  const stmts = updates.map((u) => ({
    sql: 'UPDATE tiles SET "order" = ? WHERE id = ?',
    args: [u.order, u.id],
  }));
  if (stmts.length) await db.batch(stmts, 'write');
  return { ok: true };
}

module.exports = {
  getDbMode,
  getUsersPayload,
  createUser,
  updateUser,
  deleteUser,
  createTile,
  updateTile,
  deleteTile,
  reorderTiles,
};
