const admin = require('firebase-admin');

const ALLOWED_ORIGINS = new Set([
  'https://kothabolbo.vercel.app',
  'http://localhost:5173' // local React dev
]);

function cors(req, res) {
  const origin = req.headers.origin;
  const ok = !origin || ALLOWED_ORIGINS.has(origin);
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return ok;
}

function normalizeKey(k) {
  return String(k || '').trim().replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

function init() {
  if (admin.apps.length) return admin;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizeKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  }
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  return admin;
}

module.exports = async (req, res) => {
  if (!cors(req, res)) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = await init().auth().verifyIdToken(token);
    const messageId = String(req.body?.messageId || '').trim();
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(messageId)) {
      return res.status(400).json({ error: 'Invalid messageId' });
    }

    const ref = admin.firestore().doc(`messages/${messageId}`);
    const snap = await ref.get();

    // Already gone → treat as acknowledged (client also accepts 404).
    if (!snap.exists) return res.status(200).json({ ok: true, deleted: false, reason: 'missing' });

    const msg = snap.data();
    // Critical: only the real receiver may delete. Sender cannot ACK.
    if (msg.receiverId !== decoded.uid) {
      return res.status(403).json({ error: 'Only the receiver may acknowledge' });
    }

    await ref.delete();
    return res.status(200).json({ ok: true, deleted: true, messageId });
  } catch (e) {
    console.error('[ack]', e);
    return res.status(500).json({ error: e.message || 'ACK failed' });
  }
};
