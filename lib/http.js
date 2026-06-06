function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function handle(req, res, fn) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await fn();
  } catch (err) {
    sendError(res, err);
  }
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = { handle, sendError, readBody };
