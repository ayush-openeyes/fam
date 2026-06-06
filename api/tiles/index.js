const store = require('../../lib/store');
const { handle } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return handle(req, res, async () => {
      res.status(201).json(await store.createTile(req.body));
    });
  }
  res.setHeader('Allow', 'POST');
  res.status(405).json({ error: 'Method not allowed' });
};
