const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://kothabolbo.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    initAdmin();

    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const senderUid = decoded.uid;

    const {
      receiverId,
      title,
      body,
      icon,
      image,
      url,
      messageType
    } = req.body || {};

    if (!receiverId || typeof receiverId !== 'string') {
      return res.status(400).json({ error: 'receiverId is required' });
    }
    if (receiverId === senderUid) {
      return res.status(200).json({ ok: true, skipped: 'self-message' });
    }

    const receiverRef = admin.firestore().doc(`users/${receiverId}`);
    const receiverSnap = await receiverRef.get();
    if (!receiverSnap.exists) return res.status(404).json({ error: 'Receiver not found' });

    const receiver = receiverSnap.data() || {};
    let tokens = [];
    if (Array.isArray(receiver.fcmTokens)) tokens = receiver.fcmTokens;
    if (receiver.fcmToken) tokens.push(receiver.fcmToken);
    tokens = [...new Set(tokens.filter(t => typeof t === 'string' && t.length > 20))];

    if (!tokens.length) {
      return res.status(200).json({ ok: true, sent: 0, reason: 'no-tokens' });
    }

    const safeTitle = String(title || 'Kotha Bolbo').slice(0, 80);
    const safeBody = String(body || 'You have a new message').slice(0, 180);
    const safeIcon = String(icon || '/icons/icon-192.png');
    const safeImage = image ? String(image) : undefined;
    const clickUrl = String(url || '/');

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: safeTitle,
        body: safeBody,
        ...(safeImage ? { imageUrl: safeImage } : {})
      },
      webpush: {
        notification: {
          title: safeTitle,
          body: safeBody,
          icon: safeIcon,
          badge: '/icons/icon-192.png',
          ...(safeImage ? { image: safeImage } : {}),
          tag: `kb-${senderUid}`,
          renotify: true,
          requireInteraction: false
        },
        fcmOptions: {
          link: clickUrl
        }
      },
      data: {
        title: safeTitle,
        body: safeBody,
        icon: safeIcon,
        image: safeImage || '',
        url: clickUrl,
        senderId: senderUid,
        receiverId,
        messageType: String(messageType || 'text')
      }
    });

    const invalidTokens = [];
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      await receiverRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
      }).catch(() => null);
    }

    return res.status(200).json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
      removedInvalidTokens: invalidTokens.length
    });
  } catch (err) {
    console.error('[send-notification]', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
};
