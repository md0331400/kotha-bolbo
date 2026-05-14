// ============================================================
// Kotha Bolbo - Vercel Serverless Function
// Send FCM Push Notification (Backend Only - Secure)
// Created by Sayem
// ============================================================
// ⚠️ Set these in Vercel Environment Variables:
//   FCM_SERVER_KEY = your Firebase Cloud Messaging Server Key
//   or use Google OAuth2 with service account for v1 API
// ============================================================

const https = require('https');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, senderId, senderName, chatId } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields: token, title, body' });
    }

    // ⚠️ FCM_SERVER_KEY must be set in Vercel Environment Variables
    const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

    if (!FCM_SERVER_KEY) {
      console.error('FCM_SERVER_KEY not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const payload = JSON.stringify({
      to: token,
      notification: {
        title: title,
        body: body,
        icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=kothabolbo',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      data: {
        senderId: senderId || '',
        senderName: senderName || '',
        chatId: chatId || '',
        type: 'chat_message'
      },
      priority: 'high',
      content_available: true
    });

    const options = {
      hostname: 'fcm.googleapis.com',
      path: '/fcm/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, response => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: response.statusCode, body: data });
          }
        });
      });
      request.on('error', reject);
      request.write(payload);
      request.end();
    });

    if (result.status === 200 && result.body.success === 1) {
      return res.status(200).json({ success: true, messageId: result.body.results?.[0]?.message_id });
    } else {
      console.error('FCM Error:', result.body);
      return res.status(500).json({ error: 'FCM send failed', details: result.body });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
