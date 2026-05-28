// MediSmart AI Credits API - Single Render/Vercel-compatible Node handler.
// Handles the admin panel, doctor auth, usage limits, and Groq/Gemini proxying.

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

const DEFAULT_LIMITS = {
  monthly_limit: 500,
  daily_limit: 50,
};

const COMPAT_PLANS = {
  custom: { label: "Custom limits", monthly_credits: DEFAULT_LIMITS.monthly_limit, unlimited: false },
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
function today() { return new Date().toISOString().slice(0, 10); }

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
  const cleanProvider = normalizeProvider(provider);
  const model = String(value || "").trim();
  return model || AI_PROVIDERS[cleanProvider].default_model;
}

function toLimit(value, fallback) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function providerConfig() {
  return Object.fromEntries(Object.entries(AI_PROVIDERS).map(([key, value]) => [key, {
    label: value.label,
    default_model: value.default_model,
  }]));
}

async function getAdminToken() {
  const configuredToken = String(process.env.ADMIN_TOKEN || "").trim();
  if (configuredToken) {
    const storedToken = await redis.get("admin:token");
    if (storedToken !== configuredToken) await redis.set("admin:token", configuredToken);
    return configuredToken;
  }

  let tok = await redis.get("admin:token");
  if (!tok) {
    tok = crypto.randomBytes(24).toString("hex");
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

// ---------- named AI keys ----------
async function getApiKey(keyId) {
  if (!keyId) return null;
  return await redis.get(`api_key:${keyId}`);
}

async function saveApiKey(apiKey) {
  apiKey.updated_at = nowIso();
  await redis.set(`api_key:${apiKey.id}`, apiKey);
}

async function listApiKeyIds() {
  return (await redis.smembers("api_keys:index")) || [];
}

async function indexApiKey(keyId) {
  await redis.sadd("api_keys:index", keyId);
}

async function removeApiKey(keyId) {
  await redis.del(`api_key:${keyId}`);
  await redis.srem("api_keys:index", keyId);
}

async function listApiKeys() {
  const ids = await listApiKeyIds();
  const rows = [];
  for (const id of ids) {
    const key = await getApiKey(id);
    if (key) {
      const fresh = ensureApiKeyDefaults({ ...key });
      await saveApiKey(fresh);
      rows.push(fresh);
    }
  }
  return rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

function ensureApiKeyDefaults(apiKey) {
  apiKey.id = apiKey.id || uuid();
  apiKey.name = String(apiKey.name || "AI Key").trim() || "AI Key";
  apiKey.provider = normalizeProvider(apiKey.provider);
  apiKey.model = cleanModel(apiKey.model, apiKey.provider);
  if (typeof apiKey.api_key !== "string") apiKey.api_key = "";
  if (typeof apiKey.active !== "boolean") apiKey.active = true;
  if (!apiKey.created_at) apiKey.created_at = nowIso();
  return apiKey;
}

function publicApiKeyState(apiKey, assignedCount = 0) {
  const provider = normalizeProvider(apiKey.provider);
  return {
    id: apiKey.id,
    name: apiKey.name || "",
    provider,
    provider_label: AI_PROVIDERS[provider].label,
    model: cleanModel(apiKey.model, provider),
    active: !!apiKey.active,
    has_key: Boolean(apiKey.api_key),
    assigned_count: assignedCount,
    created_at: apiKey.created_at,
    updated_at: apiKey.updated_at,
  };
}

function assignedCounts(doctors) {
  const counts = {};
  for (const doctor of doctors) {
    if (doctor.assigned_api_key_id) counts[doctor.assigned_api_key_id] = (counts[doctor.assigned_api_key_id] || 0) + 1;
  }
  return counts;
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

async function listDoctors() {
  const ids = await listDoctorIds();
  const rows = [];
  for (const id of ids) {
    const doctor = await getDoctor(id);
    if (doctor) {
      const fresh = ensureDoctorDefaults({ ...doctor });
      await saveDoctor(fresh);
      rows.push(fresh);
    }
  }
  return rows.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
}

function displayNameFromEmail(email) {
  const clean = String(email || "").trim();
  if (!clean) return "Doctor";
  return clean.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ensureDoctorDefaults(doctor) {
  doctor.id = doctor.id || uuid();
  doctor.email = String(doctor.email || "").trim();
  doctor.name = String(doctor.name || displayNameFromEmail(doctor.email)).trim() || displayNameFromEmail(doctor.email);
  if (!doctor.secret) doctor.secret = crypto.randomBytes(12).toString("hex");

  doctor.monthly_limit = toLimit(doctor.monthly_limit ?? doctor.monthly_credits, DEFAULT_LIMITS.monthly_limit);
  doctor.daily_limit = toLimit(doctor.daily_limit, DEFAULT_LIMITS.daily_limit);
  doctor.monthly_used = toLimit(doctor.monthly_used ?? doctor.used_credits, 0);
  doctor.daily_used = toLimit(doctor.daily_used, 0);
  doctor.assigned_api_key_id = String(doctor.assigned_api_key_id || doctor.api_key_id || "").trim();

  if (typeof doctor.ai_enabled !== "boolean") doctor.ai_enabled = true;
  if (typeof doctor.active !== "boolean") doctor.active = true;
  if (!doctor.renewal_date) doctor.renewal_date = nextRenewalDate();
  if (!doctor.daily_usage_date) doctor.daily_usage_date = today();
  if (!doctor.created_at) doctor.created_at = nowIso();

  if (doctor.renewal_date && doctor.renewal_date <= today()) {
    doctor.monthly_used = 0;
    doctor.renewal_date = nextRenewalDate();
  }
  if (doctor.daily_usage_date !== today()) {
    doctor.daily_used = 0;
    doctor.daily_usage_date = today();
  }

  // Compatibility aliases for older doctor clients.
  doctor.monthly_credits = doctor.monthly_limit;
  doctor.used_credits = doctor.monthly_used;
  doctor.unlimited = false;
  return doctor;
}

function publicDoctorState(doctor, apiKey = null) {
  const monthlyRemaining = Math.max(0, (doctor.monthly_limit || 0) - (doctor.monthly_used || 0));
  const dailyRemaining = Math.max(0, (doctor.daily_limit || 0) - (doctor.daily_used || 0));
  return {
    doctor_id: doctor.id,
    name: doctor.name || "",
    email: doctor.email || "",
    active: !!doctor.active,
    ai_enabled: !!doctor.ai_enabled,
    assigned_api_key_id: doctor.assigned_api_key_id || "",
    assigned_api_key_name: apiKey?.name || "",
    assigned_api_key_active: !!apiKey?.active,
    has_assigned_api_key: Boolean(apiKey?.api_key),
    ai_provider: apiKey ? normalizeProvider(apiKey.provider) : "",
    ai_provider_label: apiKey ? AI_PROVIDERS[normalizeProvider(apiKey.provider)].label : "",
    ai_model: apiKey ? cleanModel(apiKey.model, apiKey.provider) : "",
    monthly_limit: doctor.monthly_limit || 0,
    monthly_used: doctor.monthly_used || 0,
    monthly_remaining: monthlyRemaining,
    daily_limit: doctor.daily_limit || 0,
    daily_used: doctor.daily_used || 0,
    daily_remaining: dailyRemaining,
    daily_usage_date: doctor.daily_usage_date,
    renewal_date: doctor.renewal_date,
    // Compatibility aliases.
    plan_name: "custom",
    plan_label: "Custom",
    monthly_credits: doctor.monthly_limit || 0,
    used_credits: doctor.monthly_used || 0,
    remaining_credits: monthlyRemaining,
    unlimited: false,
  };
}

function adminDoctorState(doctor, apiKey = null) {
  return {
    ...publicDoctorState(doctor, apiKey),
    id: doctor.id,
    secret: doctor.secret || "",
  };
}

async function publicDoctorWithAssignedKey(doctor) {
  const apiKey = await getApiKey(doctor.assigned_api_key_id);
  return publicDoctorState(doctor, apiKey);
}

async function adminDoctorWithAssignedKey(doctor) {
  const apiKey = await getApiKey(doctor.assigned_api_key_id);
  return adminDoctorState(doctor, apiKey);
}

async function getCreditCosts() {
  const stored = await redis.get("config:credit_costs");
  return { ...DEFAULT_COSTS, ...(stored || {}) };
}

function creditCostFor(costs, action) {
  return costs[action] ?? 1;
}

function applyDoctorUpdate(doctor, body) {
  if (body.email !== undefined) doctor.email = String(body.email || "").trim();
  if (body.name !== undefined) doctor.name = String(body.name || "").trim() || displayNameFromEmail(doctor.email);
  if (body.monthly_limit !== undefined) doctor.monthly_limit = toLimit(body.monthly_limit, doctor.monthly_limit || DEFAULT_LIMITS.monthly_limit);
  if (body.daily_limit !== undefined) doctor.daily_limit = toLimit(body.daily_limit, doctor.daily_limit || DEFAULT_LIMITS.daily_limit);
  if (body.assigned_api_key_id !== undefined) doctor.assigned_api_key_id = String(body.assigned_api_key_id || "").trim();
  if (body.api_key_id !== undefined) doctor.assigned_api_key_id = String(body.api_key_id || "").trim();
  if (body.ai_enabled !== undefined) doctor.ai_enabled = !!body.ai_enabled;
  if (body.active !== undefined) doctor.active = !!body.active;
  if (typeof body.set_monthly_used === "number") doctor.monthly_used = Math.max(0, parseInt(body.set_monthly_used, 10));
  if (typeof body.set_daily_used === "number") doctor.daily_used = Math.max(0, parseInt(body.set_daily_used, 10));
  if (body.reset_monthly === true) {
    doctor.monthly_used = 0;
    doctor.renewal_date = nextRenewalDate();
  }
  if (body.reset_daily === true) {
    doctor.daily_used = 0;
    doctor.daily_usage_date = today();
  }
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
      return ok(res, { ok: true, service: "medismart-ai-credits", providers: providerConfig(), default_limits: DEFAULT_LIMITS });
    }

    if (path === "/api/plans") {
      return ok(res, { plans: COMPAT_PLANS, credit_costs: await getCreditCosts(), providers: providerConfig(), default_limits: DEFAULT_LIMITS });
    }

    // ---- doctor authentication: exchange uuid+secret for session token ----
    if (path === "/api/auth/doctor") {
      if (req.method !== "POST") return err(res, 405, "Method not allowed");
      const { doctor_id, secret } = await readJson(req);
      if (!doctor_id || !secret) return err(res, 400, "doctor_id and secret required");
      const doctor = await getDoctor(doctor_id);
      if (!doctor || !doctor.active) return err(res, 401, "Compte inactif ou inconnu");
      if (doctor.secret !== secret) return err(res, 401, "Identifiants incorrects");
      const fresh = ensureDoctorDefaults({ ...doctor });
      await saveDoctor(fresh);
      const token = uuid();
      await redis.set(`doctor:token:${token}`, fresh.id, { ex: 60 * 60 * 24 * 7 });
      return ok(res, { token, doctor: await publicDoctorWithAssignedKey(fresh) });
    }

    // ---- doctor: their own subscription ----
    if (path === "/api/me/subscription") {
      const doctor = await verifyDoctor(req);
      if (!doctor) return err(res, 401, "Token medecin invalide");
      const fresh = ensureDoctorDefaults({ ...doctor });
      await saveDoctor(fresh);
      return ok(res, { ...(await publicDoctorWithAssignedKey(fresh)), plans: COMPAT_PLANS, credit_costs: await getCreditCosts(), providers: providerConfig() });
    }

    if (path === "/api/me/logs") {
      const doctor = await verifyDoctor(req);
      if (!doctor) return err(res, 401, "Token medecin invalide");
      const logs = await readLogs(doctor.id, 100);
      const total_used = logs.reduce((s, l) => s + (l.credits_used || 0), 0);
      const byDay = {};
      for (const l of logs) {
        const day = (l.created_at || "").slice(0, 10);
        byDay[day] = (byDay[day] || 0) + (l.credits_used || 0);
      }
      const daily = Object.entries(byDay).map(([day, credits]) => ({ day, credits }))
        .sort((a, b) => b.day.localeCompare(a.day)).slice(0, 30);
      return ok(res, { rows: logs.slice(0, 50), total_used, daily });
    }

    // ---- doctor: AI chat using assigned named key ----
    if (path === "/api/me/ai/chat") {
      if (req.method !== "POST") return err(res, 405, "Method not allowed");
      const doctor = await verifyDoctor(req);
      if (!doctor) return err(res, 401, "Token medecin invalide");
      const fresh = ensureDoctorDefaults({ ...doctor });
      if (!fresh.active || !fresh.ai_enabled) return err(res, 403, "IA desactivee pour ce compte");

      const assignedKey = ensureApiKeyDefaults({ ...(await getApiKey(fresh.assigned_api_key_id) || {}) });
      if (!fresh.assigned_api_key_id) return err(res, 409, "Aucune cle API assignee a ce medecin.");
      if (!assignedKey.id || assignedKey.id !== fresh.assigned_api_key_id) return err(res, 409, "Cle API assignee introuvable.");
      if (!assignedKey.active) return err(res, 409, `La cle API "${assignedKey.name}" est inactive.`);
      if (!assignedKey.api_key) return err(res, 409, `La cle API "${assignedKey.name}" n'a pas de secret enregistre.`);

      const costs = await getCreditCosts();
      const body = await readJson(req);
      const action = (body.action_type || "chat").toString();
      const cost = creditCostFor(costs, action);
      const monthlyRemaining = Math.max(0, (fresh.monthly_limit || 0) - (fresh.monthly_used || 0));
      const dailyRemaining = Math.max(0, (fresh.daily_limit || 0) - (fresh.daily_used || 0));
      if (monthlyRemaining < cost) return err(res, 402, "Limite mensuelle atteinte");
      if (dailyRemaining < cost) return err(res, 429, "Limite journaliere atteinte");

      const messages = normalizeMessages(body);
      if (!messages.length) return err(res, 400, "Message requis");
      const maxTokens = Math.min(4096, Math.max(64, parseInt(body.max_tokens || 512, 10)));
      const provider = normalizeProvider(assignedKey.provider);
      const model = cleanModel(assignedKey.model, provider);
      const providerLabel = AI_PROVIDERS[provider].label;

      let assistantText = "";
      try {
        assistantText = await callProviderChat({ provider, apiKey: assignedKey.api_key, model, messages, maxTokens });
      } catch (e) {
        await logCreditAction(fresh.id, action, 0, false, false, `${assignedKey.name}: ${e.message}`);
        return err(res, 502, `Erreur ${providerLabel}: ${e.message}`);
      }

      fresh.monthly_used = (fresh.monthly_used || 0) + cost;
      fresh.daily_used = (fresh.daily_used || 0) + cost;
      fresh.daily_usage_date = today();
      await saveDoctor(fresh);
      await logCreditAction(fresh.id, action, cost, true, false, `${assignedKey.name} (${providerLabel} ${model})`);

      return ok(res, {
        content: assistantText,
        provider,
        model,
        api_key_name: assignedKey.name,
        credits_used: cost,
        monthly_remaining: Math.max(0, fresh.monthly_limit - fresh.monthly_used),
        daily_remaining: Math.max(0, fresh.daily_limit - fresh.daily_used),
        credits_remaining: Math.max(0, fresh.monthly_limit - fresh.monthly_used),
        safety_note: "Analyse IA a verifier par le medecin. Aucun diagnostic ou prescription automatique.",
      });
    }

    // =============================================================
    // SUPER ADMIN ENDPOINTS (require X-Admin-Token)
    // =============================================================
    if (path.startsWith("/api/admin/")) {
      if (!(await verifyAdmin(req))) return err(res, 401, "Token Super Admin invalide");

      if (path === "/api/admin/health") {
        return ok(res, {
          ok: true,
          doctors: (await listDoctorIds()).length,
          api_keys: (await listApiKeyIds()).length,
          providers: providerConfig(),
        });
      }

      if (path === "/api/admin/providers") {
        return ok(res, { providers: providerConfig() });
      }

      // Named API keys
      if (path === "/api/admin/api-keys" && req.method === "GET") {
        const doctors = await listDoctors();
        const counts = assignedCounts(doctors);
        const keys = await listApiKeys();
        return ok(res, { rows: keys.map((key) => publicApiKeyState(key, counts[key.id] || 0)), providers: providerConfig() });
      }

      if (path === "/api/admin/api-keys" && req.method === "POST") {
        const body = await readJson(req);
        if (!String(body.name || "").trim()) return err(res, 400, "Nom de cle requis");
        if (!String(body.api_key || "").trim()) return err(res, 400, "Secret API requis");
        const provider = normalizeProvider(body.provider);
        const apiKey = ensureApiKeyDefaults({
          id: uuid(),
          name: String(body.name || "").trim(),
          provider,
          model: cleanModel(body.model, provider),
          api_key: String(body.api_key || "").trim(),
          active: body.active !== false,
        });
        await saveApiKey(apiKey);
        await indexApiKey(apiKey.id);
        return ok(res, { api_key: publicApiKeyState(apiKey) }, 201);
      }

      const apiKeyMatch = path.match(/^\/api\/admin\/api-keys\/([a-f0-9-]+)$/);
      if (apiKeyMatch && (req.method === "PUT" || req.method === "PATCH")) {
        const keyId = apiKeyMatch[1];
        const apiKey = await getApiKey(keyId);
        if (!apiKey) return err(res, 404, "Cle API introuvable");
        const fresh = ensureApiKeyDefaults({ ...apiKey });
        const body = await readJson(req);
        if (body.name !== undefined) fresh.name = String(body.name || "").trim() || fresh.name;
        if (body.provider !== undefined) fresh.provider = normalizeProvider(body.provider);
        if (body.model !== undefined) fresh.model = cleanModel(body.model, fresh.provider);
        if (body.api_key !== undefined && String(body.api_key || "").trim()) fresh.api_key = String(body.api_key || "").trim();
        if (body.clear_api_key === true) fresh.api_key = "";
        if (body.active !== undefined) fresh.active = !!body.active;
        await saveApiKey(fresh);
        return ok(res, { api_key: publicApiKeyState(fresh) });
      }

      if (apiKeyMatch && req.method === "DELETE") {
        await removeApiKey(apiKeyMatch[1]);
        return ok(res, { ok: true });
      }

      // List all doctors
      if (path === "/api/admin/doctors" && req.method === "GET") {
        const doctors = await listDoctors();
        const keys = await listApiKeys();
        const keyMap = Object.fromEntries(keys.map((key) => [key.id, key]));
        const counts = assignedCounts(doctors);
        return ok(res, {
          rows: doctors.map((doctor) => adminDoctorState(doctor, keyMap[doctor.assigned_api_key_id] || null)),
          api_keys: keys.map((key) => publicApiKeyState(key, counts[key.id] || 0)),
          credit_costs: await getCreditCosts(),
          providers: providerConfig(),
          default_limits: DEFAULT_LIMITS,
        });
      }

      // Create doctor
      if (path === "/api/admin/doctors" && req.method === "POST") {
        const body = await readJson(req);
        if (!String(body.email || "").trim()) return err(res, 400, "Email requis");
        const doctor = ensureDoctorDefaults({
          id: uuid(),
          email: String(body.email || "").trim(),
          name: String(body.name || "").trim() || displayNameFromEmail(body.email),
          secret: crypto.randomBytes(12).toString("hex"),
          monthly_limit: toLimit(body.monthly_limit, DEFAULT_LIMITS.monthly_limit),
          daily_limit: toLimit(body.daily_limit, DEFAULT_LIMITS.daily_limit),
          assigned_api_key_id: String(body.assigned_api_key_id || body.api_key_id || "").trim(),
          ai_enabled: body.ai_enabled !== false,
          active: body.active !== false,
        });
        await saveDoctor(doctor);
        await indexDoctor(doctor.id);
        return ok(res, { doctor: await adminDoctorWithAssignedKey(doctor) }, 201);
      }

      // Update doctor
      const updateMatch = path.match(/^\/api\/admin\/doctors\/([a-f0-9-]+)$/);
      if (updateMatch && (req.method === "PUT" || req.method === "PATCH")) {
        const id = updateMatch[1];
        const doctor = await getDoctor(id);
        if (!doctor) return err(res, 404, "Medecin introuvable");
        const fresh = ensureDoctorDefaults({ ...doctor });
        const body = await readJson(req);
        applyDoctorUpdate(fresh, body);
        const normalized = ensureDoctorDefaults(fresh);
        await saveDoctor(normalized);
        return ok(res, { doctor: await adminDoctorWithAssignedKey(normalized) });
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
