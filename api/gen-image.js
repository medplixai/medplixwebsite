// TEMPORARY asset-generation endpoint — used once to create website images
// with the Vercel-hosted GEMINI_API_KEY, then DELETED. Bearer-token protected.
const TOKEN = '4bba6af16b3422c221c417bc3bff735417d0bdf0c396f453';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if ((req.headers.authorization || '') !== 'Bearer ' + TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY env missing' });
  const { prompt, aspect } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    let b64, via = 'imagen-4';
    try {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=' + key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: aspect || '4:3', personGeneration: 'allow_adult' },
          }),
        }
      );
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
      b64 = j.predictions[0].bytesBase64Encoded;
    } catch (e) {
      via = 'gemini-2.5-flash-image';
      const r2 = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Generate a single image, aspect ratio ' + (aspect || '4:3') + ': ' + prompt }] }],
          }),
        }
      );
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(JSON.stringify(j2).slice(0, 300));
      const parts = (j2.candidates && j2.candidates[0].content.parts) || [];
      const part = parts.find((p) => p.inlineData);
      if (!part) throw new Error('no image in response: ' + JSON.stringify(j2).slice(0, 200));
      b64 = part.inlineData.data;
    }
    res.status(200).json({ image: b64, via });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e).slice(0, 400) });
  }
};
