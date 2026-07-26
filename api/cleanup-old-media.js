const AUTO_DELETE_HOURS = 24;
const LIMIT = 25;

module.exports.config = { maxDuration: 30 };

function normalizePrivateKey(key) {
  if (!key) return '';
  let k = String(key).trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\n/g, '\n');
}

function getStorageBucketName() {
  return process.env.FIREBASE_STORAGE_BUCKET || 'kotha-bolbo-aso.firebasestorage.app';
}

function initAdmin() {
  const admin = require('firebase-admin');
  if (admin.apps.length) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env variables');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket: getStorageBucketName()
  });
  return admin;
}

async function verifyUser(req, admin) {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) throw new Error('Missing auth token');
  return await admin.auth().verifyIdToken(idToken);
}

function getImageKitPrivateKey() {
  return process.env.IMAGEKIT_PRIVATE_KEY || process.env.IK_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE || '';
}

async function deleteImageKitFile(fileId) {
  const privateKey = getImageKitPrivateKey();
  if (!privateKey) return { skipped: 'missing-imagekit-private-key' };
  if (!fileId) return { skipped: 'no-file-id' };

  const auth = Buffer.from(privateKey + ':').toString('base64');
  const res = await fetch('https://api.imagekit.io/v1/files/' + encodeURIComponent(fileId), {
    method: 'DELETE',
    headers: { Authorization: 'Basic ' + auth }
  });

  const text = await res.text().catch(() => '');
  if (!res.ok && res.status !== 404) {
    return { ok: false, status: res.status, error: text || 'ImageKit delete failed' };
  }
  return { ok: true, status: res.status };
}

async function deleteFirebaseStorageFile(admin, filePath) {
  if (!filePath) return { skipped: 'no-storage-path' };
  try {
    await admin.storage().bucket().file(filePath).delete({ ignoreNotFound: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kothabolbo.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const isVercelCron = ua.includes('vercel-cron');
    const cronSecret = process.env.CRON_SECRET || '';
    const incomingSecret = req.headers['x-cron-secret'] || (req.query && req.query.secret) || '';
    const hasCronSecret = !!cronSecret && incomingSecret === cronSecret;
    const hasAuth = !!req.headers.authorization;

    if (req.method === 'GET' && !isVercelCron && !hasCronSecret) {
      return res.status(200).json({
        ok: true,
        endpoint: 'cleanup-old-media',
        status: 'ready',
        note: 'Cleanup runs by POST with Firebase Auth or by Vercel Cron.'
      });
    }

    const admin = initAdmin();

    if (hasCronSecret || isVercelCron) {
      // allowed
    } else if (hasAuth) {
      await verifyUser(req, admin);
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cutoff = new Date(Date.now() - AUTO_DELETE_HOURS * 60 * 60 * 1000);
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

    const snap = await admin.firestore()
      .collection('messages')
      .where('timestamp', '<', cutoffTs)
      .limit(LIMIT)
      .get();

    let docsDeleted = 0;
    let mediaDeleted = 0;
    let mediaSkipped = 0;
    let mediaFailed = 0;
    const errors = [];

    for (const d of snap.docs) {
      const msg = d.data() || {};
      const imageKitFileIds = [];
      if (msg.imageFileId) imageKitFileIds.push(msg.imageFileId);
      if (msg.voiceFileId) imageKitFileIds.push(msg.voiceFileId); // legacy ImageKit voice

      for (const fileId of [...new Set(imageKitFileIds)]) {
        const r = await deleteImageKitFile(fileId).catch(e => ({ ok: false, error: e.message }));
        if (r.ok) mediaDeleted++;
        else if (r.skipped) mediaSkipped++;
        else { mediaFailed++; errors.push({ fileId, error: r.error || ('status ' + r.status) }); }
      }

      if (msg.voiceStoragePath) {
        const r = await deleteFirebaseStorageFile(admin, msg.voiceStoragePath);
        if (r.ok) mediaDeleted++;
        else if (r.skipped) mediaSkipped++;
        else { mediaFailed++; errors.push({ filePath: msg.voiceStoragePath, error: r.error }); }
      }

      await d.ref.delete();
      docsDeleted++;
    }

    return res.status(200).json({
      ok: true,
      cutoff: cutoff.toISOString(),
      scanned: snap.size,
      docsDeleted,
      mediaDeleted,
      mediaSkipped,
      mediaFailed,
      errors: errors.slice(0, 5)
    });
  } catch (err) {
    console.error('[cleanup-old-media]', err);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Internal error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
