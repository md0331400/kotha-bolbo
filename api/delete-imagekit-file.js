const admin = require('firebase-admin');

function normalizePrivateKey(key) {
  return String(key || '').trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

function initAdmin() {
  if (admin.apps.length) return admin;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin environment variables');
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  return admin;
}

async function verifyUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new Error('Missing auth token');
  return initAdmin().auth().verifyIdToken(token);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kothabolbo.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyUser(req);
    const fileId = String(req.body?.fileId || '');
    if (!fileId) return res.status(400).json({ error: 'fileId is required' });
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || process.env.IK_PRIVATE_KEY || '';
    if (!privateKey) return res.status(500).json({ error: 'Missing IMAGEKIT_PRIVATE_KEY' });

    const auth = Buffer.from(`${privateKey}:`).toString('base64');
    const result = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE', headers: { Authorization: `Basic ${auth}` }
    });
    const responseText = await result.text().catch(() => '');
    // File already missing is a successful cleanup result.
    if (!result.ok && result.status !== 404) {
      return res.status(result.status).json({ error: 'ImageKit delete failed', details: responseText });
    }
    return res.status(200).json({ ok: true, deleted: result.status !== 404, alreadyMissing: result.status === 404, fileId });
  } catch (err) {
    console.error('[delete-imagekit-file]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
