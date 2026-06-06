require('dotenv').config();

const express = require('express');
const path = require('path');
const store = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static('.'));

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get('/api/users', asyncRoute(async (req, res) => {
  res.json(await store.getUsersPayload());
}));

app.post('/api/users', asyncRoute(async (req, res) => {
  res.status(201).json(await store.createUser(req.body));
}));

app.put('/api/users/:id', asyncRoute(async (req, res) => {
  res.json(await store.updateUser(req.params.id, req.body));
}));

app.delete('/api/users/:id', asyncRoute(async (req, res) => {
  await store.deleteUser(req.params.id);
  res.status(204).end();
}));

app.post('/api/tiles', asyncRoute(async (req, res) => {
  res.status(201).json(await store.createTile(req.body));
}));

app.put('/api/tiles/reorder', asyncRoute(async (req, res) => {
  const updates = req.body && req.body.updates;
  res.json(await store.reorderTiles(updates));
}));

app.put('/api/tiles/:id', asyncRoute(async (req, res) => {
  res.json(await store.updateTile(req.params.id, req.body));
}));

app.delete('/api/tiles/:id', asyncRoute(async (req, res) => {
  await store.deleteTile(req.params.id);
  res.status(204).end();
}));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(PORT, () => {
  console.log(`Signal Room running at http://localhost:${PORT}`);
});
