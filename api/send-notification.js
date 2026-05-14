/**
 * Vercel Serverless Function: api/send-notification.js
 * --------------------------------------------------------
 * Securely sends a push notification through the OneSignal REST API.
 *
 * 🔐 SECURITY: The OneSignal REST API key is read from a Vercel
 * Environment Variable. NEVER hard-code it. NEVER expose to frontend.
 *
 * Required Vercel Environment Variables:
 *   ONESIGNAL_APP_ID       =  YOUR_ONESIGNAL_APP_ID
 *   ONESIGNAL_REST_API_KEY =  YOUR_ONESIGNAL_REST_API_KEY
 *
 * (Optional) ALLOWED_ORIGIN = https://your-vercel-domain.vercel.app
 *
 * Request body (JSON):
 * {
 *   "receiverId":  "<firebase-uid-of-receiver>",
 *   "senderId":    "<firebase-uid-of-sender>",
 *   "senderName":  "Sayem",
 *   "message":     "Hello there",
 *   "chatId":      "<chatId>"
 * }
 */

module.exports = async (req, res) => {
  // CORS
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    const { receiverId, senderId, senderName, message, chatId } = body;

    if (!receiverId || !senderId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (receiverId === senderId) {
      return res.status(200).json({ skipped: true, reason: 'self-notification' });
    }

    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !REST_KEY) {
      return res
        .status(500)
        .json({ error: 'OneSignal env vars not configured. Add ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Vercel.' });
    }

    const safeName = String(senderName || 'New message').slice(0, 60);
    const safeMsg  = String(message).slice(0, 200);
    const origin   = (allowedOrigin && allowedOrigin !== '*') ? allowedOrigin : '';
    const url      = `${origin}/?chat=${encodeURIComponent(chatId || '')}`;

    const basePayload = {
      app_id: APP_ID,
      headings: { en: safeName },
      contents: { en: safeMsg },
      url,
      data: { chatId: chatId || '', senderId },
      web_push_topic: chatId || 'kotha-bolbo'
    };

    /**
     * Attempt #1 — Newer OneSignal API:
     *   include_aliases.external_id + target_channel: 'push'
     * This is what the v16 web SDK (OneSignal.login) registers.
     */
    let response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${REST_KEY}`
      },
      body: JSON.stringify({
        ...basePayload,
        include_aliases: { external_id: [String(receiverId)] },
        target_channel: 'push'
      })
    });
    let json = await response.json().catch(() => ({}));

    // Fallback if newer endpoint says no recipients / errors
    const noRecipients =
      response.ok && (json.recipients === 0 || (Array.isArray(json.errors) && json.errors.some(e => /no subscribed/i.test(String(e)))));
    if (!response.ok || noRecipients) {
      const fallback = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${REST_KEY}`
        },
        body: JSON.stringify({
          ...basePayload,
          include_external_user_ids: [String(receiverId)],
          channel_for_external_user_ids: 'push'
        })
      });
      const fJson = await fallback.json().catch(() => ({}));
      response = fallback;
      json = fJson;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OneSignal error',
        details: json,
        hint: 'Check that ONESIGNAL_APP_ID/REST_API_KEY are correct and the receiver has allowed notifications.'
      });
    }

    return res.status(200).json({
      success: true,
      id: json.id || null,
      recipients: json.recipients ?? null,
      raw: json
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'Server error', message: err.message });
  }
};
