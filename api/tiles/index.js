const store = require('../../lib/store');
const { handle, readBody } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return handle(req, res, async () => {
      res.status(201).json(await store.createTile(readBody(req)));
    });
  }
  res.setHeader('Allow', 'POST');
  res.status(405).json({ error: 'Method not allowed' });
};
