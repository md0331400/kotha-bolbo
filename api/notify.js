export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { receiverPlayerId, senderName, messageText } = req.body || {};

  // Validation
  if (!receiverPlayerId || !messageText) {
    return res.status(400).json({ error: 'Missing fields: receiverPlayerId and messageText are required' });
  }
  if (messageText.length > 500) {
    return res.status(400).json({ error: 'messageText too long (max 500 chars)' });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (!appId || !apiKey) {
    console.error('[notify] Missing ONESIGNAL env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,

        // 'include_player_ids' is deprecated — use 'include_subscription_uuids'
        include_subscription_uuids: [receiverPlayerId],

        headings: { en: senderName || 'Kotha Bolbo' },
        contents: { en: messageText },

        // Opens the app when notification is tapped
        url: 'https://kothabolbo.vercel.app/',

        // Pass extra data to the SW / app
        data: {
          type: 'chat_message',
          senderName: senderName || '',
          messageText,
        },

        // Android: show app icon as small icon
        small_icon: 'ic_stat_onesignal_default',

        // Collapse duplicate notifications from same sender
        collapse_id: `msg_${receiverPlayerId}`,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('[notify] OneSignal error:', errData);
      return res.status(502).json({ error: 'OneSignal rejected the request', detail: errData });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });

  } catch (e) {
    console.error('[notify] Unexpected error:', e);
    return res.status(500).json({ error: 'Notification failed', detail: e.message });
  }
}
