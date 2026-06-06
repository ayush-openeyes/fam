const store = require('../../lib/store');
const { handle } = require('../../lib/http');

module.exports = async (req, res) => {
  const { id } = req.query;
  if (req.method === 'PUT') {
    return handle(req, res, async () => {
      res.status(200).json(await store.updateTile(id, req.body));
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
