const store = require('../../lib/store');
const { handle } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method === 'PUT') {
    return handle(req, res, async () => {
      const updates = req.body && req.body.updates;
      res.status(200).json(await store.reorderTiles(updates));
    });
  }
  res.setHeader('Allow', 'PUT');
  res.status(405).json({ error: 'Method not allowed' });
};
