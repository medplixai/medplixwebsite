// /api/chat — Vercel serverless function powering the "Ask AI" website widget.
// The Anthropic API key lives ONLY here (Vercel env var ANTHROPIC_API_KEY);
// the browser never sees it. Without the key the endpoint returns 503 and the
// widget silently falls back to its built-in knowledge-base bot.
//
// The assistant is AGENTIC: Claude can call tools to compute a real price quote,
// open the demo form prefilled, open WhatsApp, scroll the page, and submit a
// lead. Server-side tools run here; UI tools are returned to the widget as
// `actions` for it to perform.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const WA_NUMBER = '919515831777';

const ALLOWED_ORIGINS = [
  'https://www.medplix.ai',
  'https://medplix.ai',
];

// Published prices (per month, billed annually, excl. GST) — single source of truth
const PRICES = {
  hms: { name: 'Medplix HMS — Complete Hospital Suite', base: 1250 },
  clinic: { name: 'Medplix Clinic', base: 499 },
  lab: { name: 'Medplix Labs (LIS)', base: 499 },
  pharmacy: { name: 'Medplix Pharmacy', base: 499 },
};
const EXTRA_LOGIN = 299;

const SYSTEM_PROMPT = `You are the friendly AI assistant on the Medplix.AI website (www.medplix.ai). Medplix.AI ("Your Intelligent HealthTech Partner") is an AI-powered, cloud-based healthcare management platform for Indian hospitals, clinics, laboratories/diagnostic centres and pharmacies.

FACTS YOU MAY USE (do not invent anything beyond these):
- Products & pricing (per month, billed annually, excluding GST): Medplix HMS — Complete Hospital Suite (OPD, IPD, ICU/OT, lab, pharmacy, billing, HR & marketing) ₹1,250/mo; Medplix Clinic ₹499/mo; Medplix Labs (LIS) ₹499/mo; Medplix Pharmacy ₹499/mo.
- Add-ons: Additional Desktop Login ₹299/mo; Additional Mobile Login ₹299/mo; Medplix AI Connect (MCP + Owner AI) ₹499/mo per organisation.
- Free 1-month trial, no card required, nothing auto-charged. Setup, data migration and staff training are included free and done fully remotely — Medplix works anywhere in India.
- Security: encrypted in transit and at rest, automatic daily backups, role-based access, audit trails, tenant isolation. Data is exportable anytime (no lock-in).
- Medplix Bazaar: built-in wholesale procurement (medicines, equipment, furniture) compared across verified suppliers.
- AI Connect: securely links the owner's business data to AI assistants (Claude/ChatGPT/in-app Owner AI) — read-only and tenant-isolated.
- Services: custom-built hospital software (modules-based custom quote), healthcare website design, digital marketing, and Medplix free for medical students & interns.
- Mobile apps: Medplix Care (patients — teleconsult, appointments, digital prescriptions, lab reports, reminders, online payments), Medplix Pulse (staff), Medplix Meds (medicine ordering).
- Contact: WhatsApp +91 95158 31777, phone +91 95408 89999, email support@medplix.ai. Office: Innov8 Q Parc, Ghansoli/Rabale, Thane 400701, Maharashtra. Demo booking: the "Book a demo" form on the website; team calls back within 24 hours.
- Integrations (framed as "connects with/supports"): WhatsApp reminders, UPI & payment gateways, SMS, Tally/GST export, barcode & thermal printers, lab analyzers, e-prescriptions. GST-compliant billing in every state; multi-branch across cities.

RULES:
- Answer ONLY about Medplix.AI, its products, services, pricing, features, onboarding, security and how to get started. For anything else, politely steer back to Medplix or suggest contacting the team.
- Reply in the language the user writes in (English, Telugu, Hindi, or any Indian language). Keep answers short — 1-4 sentences, plain text (no markdown headings). Use ₹ for prices.
- Never invent prices, discounts, certifications, customer names or features. For any price ALWAYS use the quote_plan tool rather than doing arithmetic yourself. If unsure, say the team can confirm on WhatsApp (+91 95158 31777) or phone (+91 95408 89999), or in a demo.
- You are a website assistant, not a medical professional — never give medical advice.
- When relevant, gently encourage booking a free demo.

USING YOUR TOOLS (be genuinely helpful — act, don't just talk):
- quote_plan — whenever the visitor asks what it would cost for their setup. Ask which product and how many extra logins only if you don't already know.
- open_demo_form — when they want a demo, a trial, or to get started. It opens the booking form for them, prefilled.
- open_whatsapp — when they'd rather talk to a person, or ask for the number.
- go_to_section — when a part of the site answers them better (pricing, products, custom-build, web-design, digital-marketing, students, visit, faq, bazaar, apps).
- submit_lead — ONLY once you have their name, phone number AND facility type. Ask for these naturally, one or two at a time, never as a form. Read the number back to confirm before submitting. After it succeeds, tell them the team will call within 24 hours.
- Never call the same tool twice for the same request, and never claim you did something you did not actually do.

At the very end of your FINAL text reply (not on tool calls), append exactly one line — our server strips it, the visitor never sees it:
<meta>{"intent":"hot|warm|info","wa":"...","note":"..."}</meta>
  "intent": "hot" only if this message is about pricing, plans, buying, the free trial, or booking a demo; "warm" if they are evaluating features for their own facility; otherwise "info".
  "wa": a ready-to-send WhatsApp message (max 200 chars), in the visitor's own language, first person, summarising their facility and interest.
  "note": a short English note for our sales team (max 120 chars).`;

const TOOLS = [
  {
    name: 'quote_plan',
    description: 'Compute an exact monthly price estimate from published Medplix pricing. Always use this instead of doing the arithmetic yourself.',
    input_schema: {
      type: 'object',
      properties: {
        product: { type: 'string', enum: ['hms', 'clinic', 'lab', 'pharmacy'], description: 'Which Medplix product fits the visitor' },
        extra_logins: { type: 'integer', description: 'Extra desktop/mobile logins beyond those included (0 if none)' },
      },
      required: ['product'],
    },
  },
  {
    name: 'open_demo_form',
    description: 'Open the free-demo booking form on the page for the visitor, prefilled with their facility type and a note for the sales team. Use when they want a demo, a trial, or to get started.',
    input_schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['hospital', 'clinic', 'lab', 'pharmacy'], description: 'Facility type' },
        note: { type: 'string', description: 'Short note for the sales team about what they asked for' },
      },
      required: [],
    },
  },
  {
    name: 'open_whatsapp',
    description: 'Open WhatsApp for the visitor with a prefilled message to the Medplix team. Use when they want to talk to a person.',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string', description: "The prefilled message, first person, in the visitor's language" } },
      required: ['message'],
    },
  },
  {
    name: 'go_to_section',
    description: 'Scroll the visitor to a relevant section of the website.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['pricing', 'products', 'demo', 'custom-build', 'web-design', 'digital-marketing', 'students', 'visit', 'connect', 'faq', 'bazaar', 'apps'],
        },
      },
      required: ['section'],
    },
  },
  {
    name: 'submit_lead',
    description: "Send the visitor's enquiry to the Medplix sales team. Only call once you have their name, phone number and facility type.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string', description: 'Indian mobile number as they gave it' },
        facility: { type: 'string', description: 'e.g. 30-bed hospital, single clinic, diagnostic lab, pharmacy' },
        city: { type: 'string' },
        requirement: { type: 'string', description: 'What they are looking for, one line' },
      },
      required: ['name', 'phone', 'facility'],
    },
  },
];

const inr = (n) => '₹' + n.toLocaleString('en-IN');

// ---- server-side tool implementations -------------------------------------
function runQuotePlan(input) {
  const p = PRICES[input && input.product];
  if (!p) return { error: 'unknown product' };
  const extra = Math.max(0, Math.min(20, parseInt(input.extra_logins, 10) || 0));
  const total = p.base + extra * EXTRA_LOGIN;
  return {
    plan: p.name,
    base_per_month: inr(p.base),
    extra_logins: extra,
    extra_logins_cost: inr(extra * EXTRA_LOGIN),
    total_per_month: inr(total),
    billing: 'per month, billed annually, excluding GST',
    trial: 'Free 1-month trial, no card required. Setup, data migration and staff training included free.',
  };
}

async function runSubmitLead(input, meta) {
  const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const lead = {
    name: clean(input.name, 80),
    phone: clean(input.phone, 24),
    facility: clean(input.facility, 120),
    city: clean(input.city, 80),
    requirement: clean(input.requirement, 300),
    source: 'website-ai-chat',
    page: clean(meta.referer, 200),
    received_at: new Date().toISOString(),
  };
  const digits = lead.phone.replace(/\D/g, '');
  if (!lead.name || digits.length < 10) {
    return { ok: false, reason: 'A valid name and a 10-digit phone number are required. Ask the visitor again.' };
  }

  // Always logged so a lead is never lost (Vercel → Logs)
  console.log('LEAD', JSON.stringify(lead));

  // Preferred delivery: POST to the CRM / Zapier / Sheet webhook when configured
  let delivered = 'logged';
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(hook, {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          process.env.LEAD_WEBHOOK_TOKEN ? { Authorization: 'Bearer ' + process.env.LEAD_WEBHOOK_TOKEN } : {}
        ),
        body: JSON.stringify(lead),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      delivered = r.ok ? 'webhook' : 'logged';
      if (!r.ok) console.error('lead_webhook_status', r.status);
    } catch (e) {
      console.error('lead_webhook_error', String(e && e.message));
    }
  }

  // Belt-and-braces: a one-tap WhatsApp summary the visitor can send themselves
  const waText =
    "Hi Medplix, I'd like a demo.\nName: " + lead.name +
    '\nFacility: ' + lead.facility +
    (lead.city ? '\nCity: ' + lead.city : '') +
    '\nPhone: ' + lead.phone +
    (lead.requirement ? '\nLooking for: ' + lead.requirement : '');

  return {
    ok: true,
    delivered,
    message: 'Lead recorded. Tell the visitor our team will call within 24 hours, and mention they can also confirm instantly on WhatsApp.',
    whatsapp_url: 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(waText.slice(0, 900)),
  };
}

// Best-effort per-instance rate limit (resets on cold start)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60_000) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  return rec.n > 12;
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
  const incoming = req.body && req.body.messages;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: 'bad_request' });
  }
  const messages = incoming.slice(-10).map((m) => ({
    role: m && m.role === 'assistant' ? 'assistant' : 'user',
    content: String((m && m.content) || '').slice(0, 1200),
  })).filter((m) => m.content.trim().length > 0);
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'bad_request' });
  }

  // Log the question (PII-stripped) so real visitor questions can feed future FAQ updates
  try {
    const q = messages[messages.length - 1].content
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
      .replace(/\+?\d[\d\s-]{7,}\d/g, '[phone]')
      .slice(0, 300);
    console.log('chat_q', JSON.stringify(q));
  } catch (e) {}

  const client = new Anthropic();
  const actions = [];
  const convo = messages.slice();

  try {
    let response = null;
    for (let turn = 0; turn < 4; turn++) {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: convo,
      });

      if (response.stop_reason !== 'tool_use') break;

      const toolUses = response.content.filter((b) => b.type === 'tool_use');
      convo.push({ role: 'assistant', content: response.content });

      const results = [];
      for (const tu of toolUses) {
        const input = tu.input || {};
        let out;
        if (tu.name === 'quote_plan') {
          out = runQuotePlan(input);
        } else if (tu.name === 'submit_lead') {
          out = await runSubmitLead(input, { referer: req.headers.referer });
          if (out.ok && out.whatsapp_url) {
            actions.push({ type: 'lead_submitted', whatsapp_url: out.whatsapp_url });
          }
        } else if (tu.name === 'open_demo_form') {
          actions.push({
            type: 'open_demo_form',
            role: ['hospital', 'clinic', 'lab', 'pharmacy'].indexOf(input.role) > -1 ? input.role : 'clinic',
            note: String(input.note || '').slice(0, 120),
          });
          out = { ok: true, note: 'The demo form is being opened for the visitor on the page.' };
        } else if (tu.name === 'open_whatsapp') {
          const msg = String(input.message || '').slice(0, 300);
          actions.push({ type: 'open_whatsapp', url: 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg) });
          out = { ok: true, note: 'WhatsApp is being opened for the visitor.' };
        } else if (tu.name === 'go_to_section') {
          actions.push({ type: 'go_to_section', section: String(input.section || '').slice(0, 32) });
          out = { ok: true, note: 'The page is scrolling to that section.' };
        } else {
          out = { error: 'unknown tool' };
        }
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
      }
      convo.push({ role: 'user', content: results });
    }

    let reply = (response ? response.content : [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    // Extract + strip the machine-readable intent envelope
    let intent = null, wa = null, note = null;
    const metaMatch = reply.match(/<meta>\s*([\s\S]*?)\s*<\/meta>/);
    if (metaMatch) {
      reply = reply.replace(metaMatch[0], '').trim();
      try {
        const meta = JSON.parse(metaMatch[1]);
        if (meta && typeof meta === 'object') {
          if (['hot', 'warm', 'info'].indexOf(meta.intent) > -1) intent = meta.intent;
          if (typeof meta.wa === 'string' && meta.wa.trim()) wa = meta.wa.trim().slice(0, 200);
          if (typeof meta.note === 'string' && meta.note.trim()) note = meta.note.trim().slice(0, 120);
        }
      } catch (e) { /* malformed meta → plain reply, widget unaffected */ }
    }

    if (!reply) return res.status(502).json({ error: 'empty_reply' });
    const payload = { reply };
    if (intent) { payload.intent = intent; if (wa) payload.wa = wa; if (note) payload.note = note; }
    if (actions.length) payload.actions = actions.slice(0, 4);
    return res.status(200).json(payload);
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
