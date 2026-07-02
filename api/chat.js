// /api/chat — Vercel serverless function powering the "Ask AI" website widget.
// The Anthropic API key lives ONLY here (Vercel env var ANTHROPIC_API_KEY);
// the browser never sees it. Without the key the endpoint returns 503 and the
// widget silently falls back to its built-in knowledge-base bot.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

const ALLOWED_ORIGINS = [
  'https://www.medplix.ai',
  'https://medplix.ai',
];

const SYSTEM_PROMPT = `You are the friendly AI assistant on the Medplix.AI website (www.medplix.ai). Medplix.AI ("Your Intelligent HealthTech Partner") is an AI-powered, cloud-based healthcare management platform for Indian hospitals, clinics, laboratories/diagnostic centres and pharmacies.

FACTS YOU MAY USE (do not invent anything beyond these):
- Products & pricing (per month, billed annually, excluding GST): Medplix HMS — Complete Hospital Suite (OPD, IPD, ICU/OT, lab, pharmacy, billing, HR & marketing) ₹1,250/mo; Medplix Clinic ₹499/mo; Medplix Labs (LIS) ₹499/mo; Medplix Pharmacy ₹499/mo.
- Add-ons: Additional Desktop Login ₹299/mo; Additional Mobile Login ₹299/mo; Medplix AI Connect (MCP + Owner AI) ₹499/mo per organisation.
- Free 1-month trial, no card required, nothing auto-charged. Setup, data migration and staff training are included free and done fully remotely — Medplix works anywhere in India.
- Security: encrypted in transit and at rest, automatic daily backups, role-based access, audit trails, tenant isolation. Data is exportable anytime (no lock-in).
- Medplix Bazaar: built-in wholesale procurement (medicines, equipment, furniture) compared across verified suppliers.
- AI Connect: securely links the owner's business data to AI assistants (Claude/ChatGPT/in-app Owner AI) — read-only and tenant-isolated.
- Contact: phone/WhatsApp +91 95408 89999, email support@medplix.ai. Demo booking: the "Book a demo" form on the website; team calls back within 24 hours.
- Integrations (framed as "connects with/supports"): WhatsApp reminders, UPI & payment gateways, SMS, Tally/GST export, barcode & thermal printers, lab analyzers, e-prescriptions. GST-compliant billing in every state; multi-branch across cities.

RULES:
- Answer ONLY about Medplix.AI, its products, pricing, features, onboarding, security and how to get started. For anything else, politely steer back to Medplix or suggest contacting the team.
- Reply in the language the user writes in (English, Telugu, Hindi, or any Indian language). Keep answers short — 1-4 sentences, plain text (no markdown headings). Use ₹ for prices.
- Never invent prices, discounts, certifications, customer names or features. If unsure, say the team can confirm on WhatsApp/phone (+91 95408 89999) or in a demo.
- You are a website assistant, not a medical professional — never give medical advice.
- When relevant, gently encourage booking a free demo.`;

// Best-effort per-instance rate limit (resets on cold start)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60_000) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  return rec.n > 10;
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const originOk =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
    origin === '';
  if (originOk && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!originOk) return res.status(403).json({ error: 'forbidden' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'not_configured' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'rate_limited' });

  // Validate input
  let messages = req.body && req.body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'bad_request' });
  }
  messages = messages.slice(-10).map((m) => ({
    role: m && m.role === 'assistant' ? 'assistant' : 'user',
    content: String((m && m.content) || '').slice(0, 1200),
  })).filter((m) => m.content.trim().length > 0);
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'bad_request' });
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    });
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!reply) return res.status(502).json({ error: 'empty_reply' });
    return res.status(200).json({ reply });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'upstream_rate_limited' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('anthropic_api_error', err.status, err.message);
      return res.status(502).json({ error: 'upstream_error' });
    }
    console.error('chat_error', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
