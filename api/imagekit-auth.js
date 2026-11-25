const crypto = require('crypto');

const ALLOWED_ORIGINS = new Set([
  'https://kothabolbo.vercel.app',
  'http://localhost:5173'
]);

const ALLOWED_FOLDERS = new Set([
  'uploads', 'chat_images', 'voice_messages', 'web_chat',
  'profile_photos', 'profile_covers'
]);

const hits = new Map(); // per-instance best-effort rate limit

function cors(req, res) {
  const origin = req.headers.origin;
  const ok = !origin || ALLOWED_ORIGINS.has(origin);
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  return ok;
}

function adminAuth() {
  const admin = require('firebase-admin');
  if (admin.apps.length) return admin;
  const normalize = k => String(k || '').trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalize(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables');
  }
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  return admin;
}

module.exports = async (req, res) => {
  if (!cors(req, res)) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const decoded = await adminAuth().auth().verifyIdToken(token);

    // Best-effort 30 req/min per user (per serverless instance).
    const now = Date.now();
    const arr = (hits.get(decoded.uid) || []).filter(t => now - t < 60000);
    if (arr.length >= 30) return res.status(429).json({ error: 'Too many requests' });
    arr.push(now); hits.set(decoded.uid, arr);

    const folder = String((req.query && req.query.folder) || (req.body && req.body.folder) || 'uploads').slice(0, 60);
    if (!ALLOWED_FOLDERS.has(folder)) return res.status(400).json({ error: 'Folder not allowed' });

    const key = process.env.IMAGEKIT_PRIVATE_KEY || process.env.IK_PRIVATE_KEY;
    if (!key) return res.status(500).json({ error: 'Missing IMAGEKIT_PRIVATE_KEY' });

    const authToken = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 1800;
    const signature = crypto.createHmac('sha1', key).update(authToken + expire).digest('hex');

    return res.json({ token: authToken, expire, signature, folder });
  } catch (e) {
    console.error('[imagekit-auth]', e);
    return res.status(401).json({ error: e.message || 'Unauthorized' });
  }
};
