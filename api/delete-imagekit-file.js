const { deleteImageKitFile, verifyUser } = require('./_lib-media');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kothabolbo.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyUser(req);
    const { fileId } = req.body || {};
    if (!fileId || typeof fileId !== 'string') return res.status(400).json({ error: 'fileId is required' });
    await deleteImageKitFile(fileId);
    return res.status(200).json({ ok: true, deleted: true });
  } catch (err) {
    console.error('[delete-imagekit-file]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
