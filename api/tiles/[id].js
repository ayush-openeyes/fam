const store = require('../../lib/store');
const { handle, readBody } = require('../../lib/http');

module.exports = async (req, res) => {
  const { id } = req.query;
  if (req.method === 'PUT') {
    return handle(req, res, async () => {
      res.status(200).json(await store.updateTile(id, readBody(req)));
    });
  }
  if (req.method === 'DELETE') {
    return handle(req, res, async () => {
      await store.deleteTile(id);
      res.status(204).end();
    });
  }
  res.setHeader('Allow', 'PUT, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
};
