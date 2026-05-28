// MediSmart AI Credits API - Single Vercel serverless function
// Handles the admin panel, doctor routes, credits, and AI provider proxying.

import { Redis } from "@upstash/redis";
import crypto from "node:crypto";
import { ADMIN_CSS, ADMIN_HTML, ADMIN_JS } from "./admin-ui.js";

const redis = Redis.fromEnv();

const AI_PROVIDERS = {
  groq: {
    label: "Groq",
    default_model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  gemini: {
    label: "Gemini",
    default_model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
};

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const PLANS = {
  starter: { label: "Starter AI", monthly_credits: 50, unlimited: false },
  pro: { label: "Pro AI", monthly_credits: 150, unlimited: false },
  premium: { label: "Premium AI", monthly_credits: 500, unlimited: false },
  enterprise: { label: "Enterprise", monthly_credits: 999999, unlimited: true },
};

const DEFAULT_COSTS = {
  chat: 1,
  lab_analysis: 3,
  pdf_analysis: 3,
  ecg_analysis: 5,
  image_analysis: 5,
  multimodal_analysis: 10,
  irm_analysis: 10,
};

// ---------- helpers ----------
function nowIso() { return new Date().toISOString(); }

function nextRenewalDate(from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(d.getDate(), 28));
  return d.toISOString().slice(0, 10);
}

function send(res, status, contentType, body, extraHeaders = {}) {
  res.status(status).setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Doctor-Token, X-Admin-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.send(body);
}

function ok(res, body, status = 200) {
  send(res, status, "application/json", JSON.stringify(body));
}

function err(res, status, message) { ok(res, { error: message }, status); }

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      if (!buf) return resolve({});
      try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function uuid() { return crypto.randomUUID(); }

function normalizeProvider(provider) {
  const key = String(provider || "groq").toLowerCase().trim();
  return AI_PROVIDERS[key] ? key : "groq";
}

function cleanModel(value, provider) {
  const model = String(value || "").trim();
  return model || AI_PROVIDERS[provider].default_model;
}

function providerKeyField(provider) {
  return provider === "gemini" ? "gemini_api_key" : "groq_api_key";
}

function providerModelField(provider) {
  return provider === "gemini" ? "gemini_model" : "groq_model";
}

function providerConfig() {
  return Object.fromEntries(Object.entries(AI_PROVIDERS).map(([key, value]) => [key, {
    label: value.label,
    default_model: value.default_model,
  }]));
}

function activeProviderKey(doctor) {
  const provider = normalizeProvider(doctor.ai_provider);
  return String(doctor[providerKeyField(provider)] || "").trim();
}

function activeProviderModel(doctor) {
  const provider = normalizeProvider(doctor.ai_provider);
  return cleanModel(doctor[providerModelField(provider)], provider);
}

async function getAdminToken() {
  let tok = await redis.get("admin:token");
  if (!tok) {
    // Use env var if provided; otherwise generate one and persist.
    tok = process.env.ADMIN_TOKEN || crypto.randomBytes(24).toString("hex");
    await redis.set("admin:token", tok);
  }
  return tok;
}

async function verifyAdmin(req) {
  const expected = await getAdminToken();
  const got = (req.headers["x-admin-token"] || req.headers["authorization"] || "")
    .toString().replace(/^Bearer\s+/i, "").trim();
  return Boolean(got) && got === expected;
}

async function verifyDoctor(req) {
  const token = (req.headers["x-doctor-token"] || "").toString().trim();
  if (!token) return null;
  const doctorId = await redis.get(`doctor:token:${token}`);
  if (!doctorId) return null;
  return await getDoctor(doctorId);
}

// ---------- doctor records ----------
async function getDoctor(doctorId) {
  const data = await redis.get(`doctor:${doctorId}`);
  return data || null;
}

async function saveDoctor(doctor) {
  doctor.updated_at = nowIso();
  await redis.set(`doctor:${doctor.id}`, doctor);
}

async function listDoctorIds() {
  return (await redis.smembers("doctors:index")) || [];
}

async function indexDoctor(doctorId) {
  await redis.sadd("doctors:index", doctorId);
}

async function ensureDoctorDefaults(doctor) {
  if (!PLANS[doctor.plan_name]) doctor.plan_name = "starter";
  const plan = PLANS[doctor.plan_name] || PLANS.starter;
  if (typeof doctor.monthly_credits !== "number") doctor.monthly_credits = plan.monthly_credits;
  if (typeof doctor.used_credits !== "number") doctor.used_credits = 0;
  if (typeof doctor.unlimited !== "boolean") doctor.unlimited = plan.unlimited;
  if (typeof doctor.ai_enabled !== "boolean") doctor.ai_enabled = true;
  if (typeof doctor.active !== "boolean") doctor.active = true;
  doctor.ai_provider = normalizeProvider(doctor.ai_provider);
  doctor.groq_model = cleanModel(doctor.groq_model, "groq");
  doctor.gemini_model = cleanModel(doctor.gemini_model, "gemini");
  if (typeof doctor.groq_api_key !== "string") doctor.groq_api_key = "";
  if (typeof doctor.gemini_api_key !== "string") doctor.gemini_api_key = "";
  if (!doctor.renewal_date) doctor.renewal_date = nextRenewalDate();
  if (!doctor.created_at) doctor.created_at = nowIso();
  // Monthly reset
  if (doctor.renewal_date && doctor.renewal_date <= new Date().toISOString().slice(0, 10)) {
    doctor.used_credits = 0;
    doctor.renewal_date = nextRenewalDate();
  }
  return doctor;
}

function publicDoctorState(doctor) {
  const plan = PLANS[doctor.plan_name] || PLANS.starter;
  const monthly = doctor.monthly_credits || 0;
  const used = doctor.used_credits || 0;
  const unlimited = !!doctor.unlimited;
  const remaining = unlimited ? 999999 : Math.max(0, monthly - used);
  const provider = normalizeProvider(doctor.ai_provider);
  const groqModel = cleanModel(doctor.groq_model, "groq");
  const geminiModel = cleanModel(doctor.gemini_model, "gemini");
  return {
    doctor_id: doctor.id,
    name: doctor.name || "",
    email: doctor.email || "",
    plan_name: doctor.plan_name,
    plan_label: plan.label,
    monthly_credits: monthly,
    used_credits: used,
    remaining_credits: remaining,
    renewal_date: doctor.renewal_date,
    active: !!doctor.active,
    ai_enabled: !!doctor.ai_enabled,
    unlimited,
    ai_provider: provider,
    ai_provider_label: AI_PROVIDERS[provider].label,
    ai_model: provider === "gemini" ? geminiModel : groqModel,
    groq_model: groqModel,
    gemini_model: geminiModel,
    has_groq_key: Boolean(doctor.groq_api_key),
    has_gemini_key: Boolean(doctor.gemini_api_key),
    has_active_provider_key: provider === "gemini" ? Boolean(doctor.gemini_api_key) : Boolean(doctor.groq_api_key),
  };
}

async function getCreditCosts() {
  const stored = await redis.get("config:credit_costs");
  return { ...DEFAULT_COSTS, ...(stored || {}) };
}

function creditCostFor(costs, action) {
  return costs[action] ?? 1;
}

function applyPlan(doctor, planName) {
  if (!planName || !PLANS[planName]) return;
  const plan = PLANS[planName];
  doctor.plan_name = planName;
  doctor.monthly_credits = plan.monthly_credits;
  doctor.unlimited = plan.unlimited;
}

function applyProviderUpdate(doctor, body) {
  if (body.ai_provider !== undefined) doctor.ai_provider = normalizeProvider(body.ai_provider);
  if (body.groq_model !== undefined) doctor.groq_model = cleanModel(body.groq_model, "groq");
  if (body.gemini_model !== undefined) doctor.gemini_model = cleanModel(body.gemini_model, "gemini");
  if (body.groq_api_key !== undefined) doctor.groq_api_key = String(body.groq_api_key || "").trim();
  if (body.gemini_api_key !== undefined) doctor.gemini_api_key = String(body.gemini_api_key || "").trim();
  if (body.clear_groq_api_key === true) doctor.groq_api_key = "";
  if (body.clear_gemini_api_key === true) doctor.gemini_api_key = "";
}

// ---------- credit logs ----------
async function logCreditAction(doctorId, action, credits, success, cached, details = "") {
  const entry = {
    id: uuid(),
    doctor_id: doctorId,
    action_type: action,
    credits_used: credits,
    success: !!success,
    cached: !!cached,
    details: String(details || "").slice(0, 500),
    created_at: nowIso(),
  };
  await redis.lpush(`logs:${doctorId}`, JSON.stringify(entry));
  await redis.ltrim(`logs:${doctorId}`, 0, 499);
  return entry;
}

async function readLogs(doctorId, limit = 50) {
  const raw = await redis.lrange(`logs:${doctorId}`, 0, limit - 1);
  return (raw || []).map((s) => {
    try { return typeof s === "string" ? JSON.parse(s) : s; } catch { return null; }
  }).filter(Boolean);
}

// ---------- AI providers ----------
function messageText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      return part.text || part.input_text || "";
    }).filter(Boolean).join("\n");
  }
  if (content && typeof content === "object") {
    return content.text || content.input_text || content.content || "";
  }
  return "";
}

function normalizeRole(role) {
  const clean = String(role || "user").toLowerCase();
  if (clean === "system" || clean === "assistant" || clean === "user") return clean;
  if (clean === "model") return "assistant";
  return "user";
}

function normalizeMessages(body) {
  const source = Array.isArray(body.messages) && body.messages.length
    ? body.messages
    : [{ role: "user", content: (body.message || "").toString() }];
  return source.map((m) => ({
    role: normalizeRole(m?.role),
    content: messageText(m?.content).trim(),
  })).filter((m) => m.content);
}

async function readUpstreamJson(upstream) {
  const text = await upstream.text();
  try { return JSON.parse(text); } catch { return { text }; }
}

async function callGroqChat({ apiKey, model, messages, maxTokens }) {
  const upstream = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature: 0.15,
      stream: false,
    }),
  });
  const raw = await readUpstreamJson(upstream);
  if (!upstream.ok) {
    const detail = raw?.error?.message || raw?.message || raw?.text || `Groq ${upstream.status}`;
    throw new Error(detail);
  }
  return raw?.choices?.[0]?.message?.content || "";
}

function toGeminiPayload(messages) {
  const systemParts = [];
  const contents = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push({ text: message.content });
      continue;
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }
  if (!contents.length && systemParts.length) {
    contents.push({ role: "user", parts: [{ text: systemParts.map((p) => p.text).join("\n\n") }] });
  }
  return {
    contents,
    systemInstruction: systemParts.length ? { parts: systemParts } : undefined,
  };
}

function geminiModelPath(model) {
  return cleanModel(model, "gemini").replace(/^models\//, "").split("/").map(encodeURIComponent).join("/");
}

async function callGeminiChat({ apiKey, model, messages, maxTokens }) {
  const gemini = toGeminiPayload(messages);
  const body = {
    contents: gemini.contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.15,
    },
  };
  if (gemini.systemInstruction) body.systemInstruction = gemini.systemInstruction;

  const upstream = await fetch(`${GEMINI_GENERATE_URL}/${geminiModelPath(model)}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await readUpstreamJson(upstream);
  if (!upstream.ok) {
    const detail = raw?.error?.message || raw?.message || raw?.text || `Gemini ${upstream.status}`;
    throw new Error(detail);
  }
  return (raw?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("").trim();
}

async function callProviderChat({ provider, apiKey, model, messages, maxTokens }) {
  if (provider === "gemini") return callGeminiChat({ apiKey, model, messages, maxTokens });
  return callGroqChat({ apiKey, model, messages, maxTokens });
}

// ---------- main router ----------
export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return ok(res, {});

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // ---- admin frontend ----
    if (req.method === "GET" && (path === "/" || path === "/admin")) {
      return send(res, 200, "text/html; charset=utf-8", ADMIN_HTML);
    }
    if (req.method === "GET" && path === "/admin.css") {
      return send(res, 200, "text/css; charset=utf-8", ADMIN_CSS, { "Cache-Control": "public, max-age=300" });
    }
    if (req.method === "GET" && path === "/admin.js") {
      return send(res, 200, "text/javascript; charset=utf-8", ADMIN_JS, { "Cache-Control": "public, max-age=300" });
    }

    // ---- public ----
    if (path === "/api" || path === "/api/health") {
      return ok(res, { ok: true, service: "medismart-ai-credits", providers: providerConfig() });
    }

    if (path === "/api/plans") {
      return ok(res, { plans: PLANS, credit_costs: await getCreditCosts(), providers: providerConfig() });
    }

    // ---- doctor authentication: exchange uuid+secret for session token ----
    if (path === "/api/auth/doctor") {
      if (req.method !== "POST") return err(res, 405, "Method not allowed");
      const { doctor_id, secret } = await readJson(req);
      if (!doctor_id || !secret) return err(res, 400, "doctor_id and secret required");
      const doctor = await getDoctor(doctor_id);
      if (!doctor || !doctor.active) return err(res, 401, "Compte inactif ou inconnu");
      if (doctor.secret !== secret) return err(res, 401, "Identifiants incorrects");
      const fresh = await ensureDoctorDefaults({ ...doctor });
      await saveDoctor(fresh);
      const token = uuid();
      await redis.set(`doctor:token:${token}`, fresh.id, { ex: 60 * 60 * 24 * 7 }); // 7 days
      return ok(res, { token, doctor: publicDoctorState(fresh) });
    }

    // ---- doctor: their own subscription ----
    if (path === "/api/me/subscription") {
      const doctor = await verifyDoctor(req);
      if (!doctor) return err(res, 401, "Token medecin invalide");
      const fresh = await ensureDoctorDefaults({ ...doctor });
      await saveDoctor(fresh);
      return ok(res, { ...publicDoctorState(fresh), plans: PLANS, credit_costs: await getCreditCosts(), providers: providerConfig() });
    }

    if (path === "/api/me/logs") {
      const doctor = await verifyDoctor(req);
      if (!doctor) return err(res, 401, "Token medecin invalide");
      const logs = await readLogs(doctor.id, 100);
      const total_used = logs.reduce((s, l) => s + (l.credits_used || 0), 0);
      const cache_hits = logs.filter((l) => l.cached).length;
      const byDay = {};
      for (const l of logs) {
        const day = (l.created_at || "").slice(0, 10);
        byDay[day] = (byDay[day] || 0) + (l.credits_used || 0);
      }
      const daily = Object.entries(byDay).map(([day, credits]) => ({ day, credits }))
        .sort((a, b) => b.day.localeCompare(a.day)).slice(0, 30);
      return ok(res, { rows: logs.slice(0, 50), total_used, cache_hits, daily });
    }

    // ---- doctor: AI chat (proxies to Groq or Gemini using doctor's stored key) ----
    if (path === "/api/me/ai/chat") {
      if (req.method !== "POST") return err(res, 405, "Method not allowed");
      const doctor = await verifyDoctor(req);
      if (!doctor) return err(res, 401, "Token medecin invalide");
      const fresh = await ensureDoctorDefaults({ ...doctor });
      if (!fresh.active || !fresh.ai_enabled) return err(res, 403, "IA desactivee pour ce compte");
      const costs = await getCreditCosts();
      const body = await readJson(req);
      const action = (body.action_type || "chat").toString();
      const cost = creditCostFor(costs, action);
      const remaining = fresh.unlimited ? 999999 : Math.max(0, (fresh.monthly_credits || 0) - (fresh.used_credits || 0));
      if (!fresh.unlimited && remaining < cost) return err(res, 402, "Credits IA insuffisants");

      const provider = normalizeProvider(fresh.ai_provider);
      const providerLabel = AI_PROVIDERS[provider].label;
      const apiKey = activeProviderKey(fresh);
      const model = activeProviderModel(fresh);
      if (!apiKey) return err(res, 409, `Cle ${providerLabel} non assignee. Contactez l'administrateur.`);

      const messages = normalizeMessages(body);
      if (!messages.length) return err(res, 400, "Message requis");
      const maxTokens = Math.min(4096, Math.max(64, parseInt(body.max_tokens || 512, 10)));

      let assistantText = "";
      try {
        assistantText = await callProviderChat({ provider, apiKey, model, messages, maxTokens });
      } catch (e) {
        await logCreditAction(fresh.id, action, 0, false, false, `${providerLabel}: ${e.message}`);
        return err(res, 502, `Erreur ${providerLabel}: ${e.message}`);
      }

      if (!fresh.unlimited) {
        fresh.used_credits = (fresh.used_credits || 0) + cost;
      }
      await saveDoctor(fresh);
      await logCreditAction(fresh.id, action, fresh.unlimited ? 0 : cost, true, false, `${providerLabel} ${model}`);

      return ok(res, {
        content: assistantText,
        provider,
        model,
        credits_used: fresh.unlimited ? 0 : cost,
        credits_remaining: fresh.unlimited ? 999999 : Math.max(0, fresh.monthly_credits - fresh.used_credits),
        safety_note: "Analyse IA a verifier par le medecin. Aucun diagnostic ou prescription automatique.",
      });
    }

    // =============================================================
    // SUPER ADMIN ENDPOINTS (require X-Admin-Token)
    // =============================================================
    if (path.startsWith("/api/admin/")) {
      if (!(await verifyAdmin(req))) return err(res, 401, "Token Super Admin invalide");

      if (path === "/api/admin/health") {
        return ok(res, { ok: true, doctors: (await listDoctorIds()).length, providers: providerConfig() });
      }

      if (path === "/api/admin/providers") {
        return ok(res, { providers: providerConfig() });
      }

      // List all doctors (no patient data)
      if (path === "/api/admin/doctors" && req.method === "GET") {
        const ids = await listDoctorIds();
        const rows = [];
        for (const id of ids) {
          const d = await getDoctor(id);
          if (d) {
            const fresh = await ensureDoctorDefaults({ ...d });
            await saveDoctor(fresh);
            rows.push(publicDoctorState(fresh));
          }
        }
        return ok(res, { rows, plans: PLANS, credit_costs: await getCreditCosts(), providers: providerConfig() });
      }

      // Create doctor
      if (path === "/api/admin/doctors" && req.method === "POST") {
        const body = await readJson(req);
        const id = uuid();
        const secret = body.secret || crypto.randomBytes(12).toString("hex");
        const doctor = await ensureDoctorDefaults({
          id,
          name: (body.name || "Dr").toString(),
          email: (body.email || "").toString(),
          secret,
          ai_provider: normalizeProvider(body.ai_provider),
          groq_api_key: (body.groq_api_key || "").toString().trim(),
          gemini_api_key: (body.gemini_api_key || "").toString().trim(),
          groq_model: cleanModel(body.groq_model, "groq"),
          gemini_model: cleanModel(body.gemini_model, "gemini"),
          plan_name: PLANS[body.plan_name] ? body.plan_name : "starter",
          ai_enabled: body.ai_enabled !== false,
          active: body.active !== false,
        });
        applyPlan(doctor, doctor.plan_name);
        await saveDoctor(doctor);
        await indexDoctor(id);
        return ok(res, { doctor: { ...publicDoctorState(doctor), id, secret } }, 201);
      }

      // Update doctor (plan, provider keys, ai_enabled, credits)
      const updateMatch = path.match(/^\/api\/admin\/doctors\/([a-f0-9-]+)$/);
      if (updateMatch && (req.method === "PUT" || req.method === "PATCH")) {
        const id = updateMatch[1];
        const doctor = await getDoctor(id);
        if (!doctor) return err(res, 404, "Medecin introuvable");
        const fresh = await ensureDoctorDefaults({ ...doctor });
        const body = await readJson(req);
        if (body.name !== undefined) fresh.name = String(body.name);
        if (body.email !== undefined) fresh.email = String(body.email);
        applyProviderUpdate(fresh, body);
        if (body.ai_enabled !== undefined) fresh.ai_enabled = !!body.ai_enabled;
        if (body.active !== undefined) fresh.active = !!body.active;
        if (body.plan_name) applyPlan(fresh, body.plan_name);
        if (typeof body.add_credits === "number") {
          fresh.used_credits = Math.max(0, (fresh.used_credits || 0) - body.add_credits);
        }
        if (typeof body.set_used_credits === "number") {
          fresh.used_credits = Math.max(0, body.set_used_credits);
        }
        if (body.reset_monthly === true) {
          fresh.used_credits = 0;
          fresh.renewal_date = nextRenewalDate();
        }
        await saveDoctor(fresh);
        return ok(res, { doctor: publicDoctorState(fresh) });
      }

      // Delete doctor
      if (updateMatch && req.method === "DELETE") {
        const id = updateMatch[1];
        await redis.del(`doctor:${id}`);
        await redis.srem("doctors:index", id);
        await redis.del(`logs:${id}`);
        return ok(res, { ok: true });
      }

      // Logs for one doctor
      const logsMatch = path.match(/^\/api\/admin\/doctors\/([a-f0-9-]+)\/logs$/);
      if (logsMatch) {
        const logs = await readLogs(logsMatch[1], 200);
        return ok(res, { rows: logs });
      }

      // Update credit costs config
      if (path === "/api/admin/credit-costs" && req.method === "PUT") {
        const body = await readJson(req);
        const safe = {};
        for (const k of Object.keys(DEFAULT_COSTS)) {
          if (typeof body[k] === "number") safe[k] = Math.max(0, parseInt(body[k], 10));
        }
        await redis.set("config:credit_costs", safe);
        return ok(res, { credit_costs: { ...DEFAULT_COSTS, ...safe } });
      }

      return err(res, 404, "Route admin inconnue");
    }

    return err(res, 404, "Route inconnue");
  } catch (e) {
    return err(res, 500, e.message || "Erreur serveur");
  }
}
