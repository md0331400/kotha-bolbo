const crypto = require('crypto');

function getImageKitPrivateKey() {
  return process.env.IMAGEKIT_PRIVATE_KEY || process.env.IK_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE || '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kothabolbo.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const privateKey = getImageKitPrivateKey();
    if (!privateKey) {
      return res.status(500).json({ error: 'Missing IMAGEKIT_PRIVATE_KEY environment variable' });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 60 * 30; // 30 minutes
    const signature = crypto
      .createHmac('sha1', privateKey)
      .update(token + expire)
      .digest('hex');

    return res.status(200).json({ token, expire, signature });
  } catch (err) {
    console.error('[imagekit-auth]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
