const { admin, initAdmin, deleteImageKitFile, verifyUser } = require('./_lib-media');

const AUTO_DELETE_HOURS = 24;
const LIMIT = 200;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kothabolbo.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    initAdmin();

    // Allow either logged-in app users or optional cron secret.
    const cronSecret = process.env.CRON_SECRET || '';
    const incomingSecret = req.headers['x-cron-secret'] || req.query?.secret || '';
    if (cronSecret && incomingSecret === cronSecret) {
      // ok
    } else if (req.headers.authorization) {
      await verifyUser(req);
    } else if (req.headers['user-agent'] && String(req.headers['user-agent']).includes('vercel-cron')) {
      // Vercel Cron call; allowed if endpoint isn't protected by CRON_SECRET.
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
    let mediaFailed = 0;
    const errors = [];

    for (const d of snap.docs) {
      const msg = d.data() || {};
      const fileIds = [];
      if (msg.imageFileId) fileIds.push(msg.imageFileId);
      if (msg.voiceFileId) fileIds.push(msg.voiceFileId);

      for (const fileId of [...new Set(fileIds)]) {
        try {
          await deleteImageKitFile(fileId);
          mediaDeleted++;
        } catch (e) {
          mediaFailed++;
          errors.push({ fileId, error: e.message });
        }
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
      mediaFailed,
      errors: errors.slice(0, 5)
    });
  } catch (err) {
    console.error('[cleanup-old-media]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
