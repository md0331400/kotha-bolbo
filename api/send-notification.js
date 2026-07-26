const admin = require('firebase-admin');

function normalizePrivateKey(key) {
  if (!key) return '';
  let k = String(key).trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, '\n');
}

function getEnvStatus() {
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = normalizePrivateKey(privateKeyRaw);
  return {
    hasProjectId: !!projectId,
    projectId,
    hasClientEmail: !!clientEmail,
    clientEmailEndsWith: clientEmail ? clientEmail.split('@')[1] : '',
    hasPrivateKey: !!privateKey,
    privateKeyLooksValid: privateKey.includes('-----BEGIN PRIVATE KEY-----') && privateKey.includes('-----END PRIVATE KEY-----')
  };
}

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const envStatus = getEnvStatus();

  if (!envStatus.hasProjectId || !envStatus.hasClientEmail || !envStatus.hasPrivateKey) {
    const err = new Error('Missing Firebase Admin environment variables');
    err.envStatus = envStatus;
    throw err;
  }
  if (!envStatus.privateKeyLooksValid) {
    const err = new Error('FIREBASE_PRIVATE_KEY format is invalid');
    err.envStatus = envStatus;
    throw err;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
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

    const { receiverId, title, body, icon, image, url, messageType, messageId } = req.body || {};
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

    if (!tokens.length) return res.status(200).json({ ok: true, sent: 0, reason: 'no-tokens' });

    const safeTitle = String(title || 'Kotha Bolbo').slice(0, 80);
    const safeBody = String(body || 'You have a new message').slice(0, 180);
    const safeIcon = String(icon || 'https://kothabolbo.vercel.app/icons/icon-192.png');
    const safeImage = image ? String(image) : '';
    const clickUrl = String(url || 'https://kothabolbo.vercel.app/');
    const safeType = String(messageType || 'text');

    /*
      IMPORTANT FIX:
      We send DATA-ONLY web push.
      If we send top-level `notification` / `webpush.notification` AND also call
      showNotification() inside firebase-messaging-sw.js, Chrome shows TWO notifications.
      Data-only lets the Service Worker show exactly ONE custom notification.
    */
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      // Android needs an explicit HIGH priority block. webpush-only configuration
      // does not wake a background native Android app reliably.
      android: {
        priority: 'high',
        ttl: 2419200000
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '2419200'
        },
        fcmOptions: {
          link: clickUrl
        }
      },
      data: {
        title: safeTitle,
        body: safeBody,
        icon: safeIcon,
        image: safeImage,
        url: clickUrl,
        senderId: senderUid,
        receiverId,
        messageType: safeType,
        tag: `kb-chat-${senderUid}`,
        sentAt: String(Date.now())
      }
    });

    const invalidTokens = [];
    const errors = [];
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        errors.push({ code, message: r.error && r.error.message });
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) invalidTokens.push(tokens[idx]);
      }
    });

    // FCM accepted the message for at least one receiver token.
    if (messageId && response.successCount > 0) {
      await admin.firestore().doc(`messages/${messageId}`).update({
        delivered: true, deliveredAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch(() => null);
    }

    if (invalidTokens.length) {
      await receiverRef.update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens) }).catch(() => null);
    }

    return res.status(200).json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
      removedInvalidTokens: invalidTokens.length,
      errors: errors.slice(0, 3)
    });
  } catch (err) {
    console.error('[send-notification]', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      envStatus: err.envStatus || getEnvStatus()
    });

    return res.status(500).json({
      error: err.message || 'Internal error',
      code: err.code || null,
      envStatus: err.envStatus || getEnvStatus()
    });
  }
};
