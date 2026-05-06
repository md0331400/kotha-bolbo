export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { receiverPlayerId, senderName, messageText } = req.body || {};
  if (!receiverPlayerId || !messageText) return res.status(400).json({ error: 'Missing fields' });

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_player_ids: [receiverPlayerId],
        headings: { en: senderName || 'Kotha Bolbo' },
        contents: { en: messageText },
        data: { type: 'chat_message' }
      })
    });
    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: 'Notification failed' });
  }
}
