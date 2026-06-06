function sendError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
}

async function handle(req, res, fn) {
  try {
    await fn();
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = { handle, sendError };
