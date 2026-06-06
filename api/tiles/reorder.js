const store = require('../../lib/store');
const { handle, readBody } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method === 'PUT') {
    return handle(req, res, async () => {
      const body = readBody(req);
      res.status(200).json(await store.reorderTiles(body.updates));
    });
  }
  res.setHeader('Allow', 'PUT');
  res.status(405).json({ error: 'Method not allowed' });
};
