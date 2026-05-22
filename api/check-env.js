module.exports = async function handler(req, res) {
  const keyRaw = process.env.FIREBASE_PRIVATE_KEY || '';
  const key = String(keyRaw).trim().replace(/\\n/g, '\n');
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    FIREBASE_PROJECT_ID: {
      exists: !!projectId,
      value: projectId || null
    },
    FIREBASE_CLIENT_EMAIL: {
      exists: !!clientEmail,
      looksValid: clientEmail.includes('@') && clientEmail.includes('.iam.gserviceaccount.com'),
      domain: clientEmail.includes('@') ? clientEmail.split('@')[1] : null
    },
    FIREBASE_PRIVATE_KEY: {
      exists: !!keyRaw,
      length: keyRaw.length,
      hasBeginLine: key.includes('-----BEGIN PRIVATE KEY-----'),
      hasEndLine: key.includes('-----END PRIVATE KEY-----'),
      containsEscapedNewlines: String(keyRaw).includes('\\n'),
      containsRealNewlines: String(keyRaw).includes('\n'),
      startsWith: key ? key.slice(0, 27) : null,
      endsWith: key ? key.slice(-25) : null
    }
  });
};
