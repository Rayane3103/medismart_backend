export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MediSmart Admin</title>
  <link rel="stylesheet" href="/admin.css">
  <script defer src="/admin.js"></script>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="/admin" aria-label="MediSmart Admin">
        <span class="brand-mark">M</span>
        <span>
          <strong>MediSmart</strong>
          <small>AI Credits</small>
        </span>
      </a>
      <div class="top-actions">
        <button class="ghost hidden" id="refreshButton" type="button">Refresh</button>
        <button class="danger ghost hidden" id="logoutButton" type="button">Sign out</button>
      </div>
    </header>

    <section class="auth-panel" id="authPanel">
      <div class="auth-card">
        <div>
          <p class="eyebrow">Super Admin</p>
          <h1>Provider keys, doctor credits, and AI access.</h1>
        </div>
        <form id="authForm" class="auth-form">
          <label>
            <span>Admin token</span>
            <input id="adminToken" name="adminToken" type="password" autocomplete="current-password" required>
          </label>
          <button type="submit">Open panel</button>
        </form>
      </div>
    </section>

    <main class="app hidden" id="app">
      <section class="workspace-head">
        <div>
          <p class="eyebrow">Operations</p>
          <h1>Doctors</h1>
        </div>
        <button id="newDoctorButton" type="button">New doctor</button>
      </section>

      <section class="metrics" id="metrics"></section>

      <section class="controls">
        <label class="search-box">
          <span>Search</span>
          <input id="searchInput" type="search" placeholder="Name, email, or doctor ID">
        </label>
        <label>
          <span>Provider</span>
          <select id="providerFilter">
            <option value="all">All providers</option>
          </select>
        </label>
      </section>

      <section class="surface">
        <div class="surface-head">
          <h2>Accounts</h2>
          <span id="doctorCount">0 records</span>
        </div>
        <div class="doctor-list" id="doctorRows"></div>
      </section>

      <section class="surface compact">
        <div class="surface-head">
          <h2>Credit Costs</h2>
          <button class="ghost" id="saveCostsButton" type="button">Save costs</button>
        </div>
        <div class="cost-grid" id="costGrid"></div>
      </section>
    </main>
  </div>

  <dialog class="modal" id="doctorDialog">
    <form method="dialog" class="modal-panel" id="doctorForm">
      <div class="modal-head">
        <div>
          <p class="eyebrow" id="doctorDialogMode">Create</p>
          <h2 id="doctorDialogTitle">New doctor</h2>
        </div>
        <button class="icon-button" value="cancel" type="button" data-close-dialog="doctorDialog" aria-label="Close">x</button>
      </div>

      <input type="hidden" id="doctorId">
      <div class="form-grid">
        <label>
          <span>Name</span>
          <input id="doctorName" name="name" required>
        </label>
        <label>
          <span>Email</span>
          <input id="doctorEmail" name="email" type="email">
        </label>
        <label>
          <span>Plan</span>
          <select id="doctorPlan" name="plan_name"></select>
        </label>
        <label id="secretField">
          <span>Secret</span>
          <input id="doctorSecret" name="secret" autocomplete="new-password" placeholder="Generated if empty">
        </label>
      </div>

      <div class="toggle-row">
        <label class="toggle">
          <input id="doctorActive" type="checkbox" checked>
          <span></span>
          Active
        </label>
        <label class="toggle">
          <input id="doctorAiEnabled" type="checkbox" checked>
          <span></span>
          AI enabled
        </label>
      </div>

      <section class="provider-editor">
        <div class="surface-head inline">
          <h3>AI Provider</h3>
        </div>
        <div class="segmented" id="providerSegment">
          <label>
            <input type="radio" name="ai_provider" value="groq" checked>
            <span>Groq</span>
          </label>
          <label>
            <input type="radio" name="ai_provider" value="gemini">
            <span>Gemini</span>
          </label>
        </div>
        <div class="key-grid">
          <div class="key-box">
            <div class="key-title">
              <strong>Groq</strong>
              <span id="groqKeyState">No key</span>
            </div>
            <label>
              <span>API key</span>
              <input id="groqApiKey" type="password" autocomplete="off" placeholder="Paste a new Groq key">
            </label>
            <label>
              <span>Model</span>
              <input id="groqModel">
            </label>
            <label class="mini-check hidden" id="clearGroqWrap">
              <input id="clearGroqKey" type="checkbox">
              Clear saved Groq key
            </label>
          </div>
          <div class="key-box">
            <div class="key-title">
              <strong>Gemini</strong>
              <span id="geminiKeyState">No key</span>
            </div>
            <label>
              <span>API key</span>
              <input id="geminiApiKey" type="password" autocomplete="off" placeholder="Paste a new Gemini key">
            </label>
            <label>
              <span>Model</span>
              <input id="geminiModel">
            </label>
            <label class="mini-check hidden" id="clearGeminiWrap">
              <input id="clearGeminiKey" type="checkbox">
              Clear saved Gemini key
            </label>
          </div>
        </div>
      </section>

      <section class="credit-tools">
        <label>
          <span>Add credits</span>
          <input id="addCredits" type="number" min="0" step="1" placeholder="0">
        </label>
        <label>
          <span>Set used credits</span>
          <input id="setUsedCredits" type="number" min="0" step="1" placeholder="Leave empty">
        </label>
        <label class="mini-check">
          <input id="resetMonthly" type="checkbox">
          Reset monthly usage
        </label>
      </section>

      <div class="modal-actions">
        <button class="ghost" type="button" data-close-dialog="doctorDialog">Cancel</button>
        <button type="submit">Save doctor</button>
      </div>
    </form>
  </dialog>

  <dialog class="modal" id="logsDialog">
    <div class="modal-panel logs-panel">
      <div class="modal-head">
        <div>
          <p class="eyebrow">Activity</p>
          <h2 id="logsTitle">Logs</h2>
        </div>
        <button class="icon-button" type="button" data-close-dialog="logsDialog" aria-label="Close">x</button>
      </div>
      <div id="logsRows" class="logs-list"></div>
    </div>
  </dialog>

  <dialog class="modal" id="credentialsDialog">
    <div class="modal-panel credentials-panel">
      <div class="modal-head">
        <div>
          <p class="eyebrow">Credentials</p>
          <h2>Doctor login</h2>
        </div>
        <button class="icon-button" type="button" data-close-dialog="credentialsDialog" aria-label="Close">x</button>
      </div>
      <div class="credential-grid">
        <label>
          <span>Doctor ID</span>
          <input id="createdDoctorId" readonly>
        </label>
        <button class="ghost" type="button" data-copy="createdDoctorId">Copy ID</button>
        <label>
          <span>Secret</span>
          <input id="createdDoctorSecret" readonly>
        </label>
        <button class="ghost" type="button" data-copy="createdDoctorSecret">Copy secret</button>
      </div>
      <div class="modal-actions">
        <button type="button" data-close-dialog="credentialsDialog">Done</button>
      </div>
    </div>
  </dialog>

  <div class="toast hidden" id="toast"></div>
</body>
</html>`;

export const ADMIN_CSS = `:root {
  color-scheme: light;
  --ink: #14201d;
  --muted: #66716d;
  --line: #dce4e1;
  --panel: #ffffff;
  --page: #f4f7f6;
  --deep: #102a25;
  --teal: #008a7a;
  --teal-soft: #dff5f1;
  --coral: #d85b4f;
  --coral-soft: #ffe8e4;
  --amber: #b7791f;
  --amber-soft: #fff2d6;
  --violet: #6750a4;
  --violet-soft: #ece7ff;
  --shadow: 0 18px 50px rgba(16, 42, 37, 0.12);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--page);
  color: var(--ink);
  min-width: 320px;
}

button, input, select {
  font: inherit;
}

button {
  border: 0;
  border-radius: 8px;
  min-height: 40px;
  padding: 0 16px;
  background: var(--teal);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

button:hover { filter: brightness(0.96); }
button:disabled { opacity: 0.55; cursor: not-allowed; }

.ghost {
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--line);
}

.danger { color: var(--coral); }

.icon-button {
  width: 36px;
  min-height: 36px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: #eef4f2;
  color: var(--ink);
}

.hidden { display: none !important; }

.shell {
  min-height: 100vh;
}

.topbar {
  height: 72px;
  padding: 0 clamp(16px, 4vw, 40px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(14px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: inline-grid;
  place-items: center;
  background: var(--deep);
  color: #fff;
  font-weight: 900;
}

.brand strong, .brand small {
  display: block;
  line-height: 1.1;
}

.brand small {
  color: var(--muted);
  font-size: 12px;
  margin-top: 3px;
}

.top-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.auth-panel {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-card {
  width: min(920px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: end;
  background: var(--deep);
  color: #fff;
  border-radius: 8px;
  padding: clamp(24px, 5vw, 48px);
  box-shadow: var(--shadow);
}

.auth-card h1 {
  margin: 8px 0 0;
  font-size: clamp(32px, 6vw, 62px);
  line-height: 0.98;
  max-width: 720px;
  letter-spacing: 0;
}

.auth-card .eyebrow { color: #9ce3d8; }

.auth-form {
  display: grid;
  gap: 14px;
  background: #fff;
  color: var(--ink);
  border-radius: 8px;
  padding: 18px;
}

.app {
  width: min(1280px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 48px;
}

.workspace-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.workspace-head h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 52px);
  line-height: 1;
  letter-spacing: 0;
}

.eyebrow {
  margin: 0 0 7px;
  color: var(--teal);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 900;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.metric {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  min-height: 96px;
}

.metric span {
  color: var(--muted);
  font-size: 13px;
}

.metric strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  line-height: 1;
}

.controls {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 220px;
  gap: 12px;
  margin-bottom: 14px;
}

label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

input, select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  padding: 0 12px;
  outline: none;
}

input:focus, select:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(0, 138, 122, 0.14);
}

.surface {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-bottom: 14px;
  overflow: hidden;
}

.surface.compact { padding-bottom: 4px; }

.surface-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--line);
}

.surface-head.inline {
  padding: 0;
  border-bottom: 0;
  margin-bottom: 10px;
}

.surface-head h2, .surface-head h3 {
  margin: 0;
  font-size: 18px;
}

.surface-head span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.doctor-list {
  display: grid;
}

.doctor-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) minmax(160px, 0.8fr) minmax(180px, 0.8fr) minmax(230px, auto);
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--line);
}

.doctor-row:first-child { border-top: 0; }

.doctor-main strong {
  display: block;
  font-size: 16px;
  margin-bottom: 5px;
}

.doctor-main span, .subtle {
  display: block;
  color: var(--muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}

.badge {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  background: #eef4f2;
  color: var(--deep);
  font-size: 12px;
  font-weight: 800;
}

.badge.teal { background: var(--teal-soft); color: #006a5d; }
.badge.coral { background: var(--coral-soft); color: #9e332a; }
.badge.amber { background: var(--amber-soft); color: var(--amber); }
.badge.violet { background: var(--violet-soft); color: var(--violet); }

.progress {
  height: 8px;
  border-radius: 999px;
  background: #edf2f0;
  overflow: hidden;
  margin-top: 8px;
}

.progress span {
  display: block;
  height: 100%;
  background: var(--teal);
  min-width: 2px;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.row-actions button {
  min-height: 34px;
  padding: 0 11px;
  font-size: 13px;
}

.empty {
  padding: 34px 16px;
  text-align: center;
  color: var(--muted);
}

.cost-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

.modal {
  width: min(920px, calc(100% - 24px));
  border: 0;
  padding: 0;
  background: transparent;
}

.modal::backdrop {
  background: rgba(16, 32, 29, 0.42);
  backdrop-filter: blur(5px);
}

.modal-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: var(--shadow);
  border: 1px solid var(--line);
  padding: 18px;
}

.modal-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-head h2 {
  margin: 0;
  font-size: 24px;
}

.form-grid, .key-grid, .credit-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.toggle-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 16px 0;
}

.toggle, .mini-check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--ink);
}

.toggle input, .mini-check input {
  width: 18px;
  height: 18px;
  min-height: 18px;
  padding: 0;
}

.provider-editor, .credit-tools {
  border-top: 1px solid var(--line);
  padding-top: 16px;
  margin-top: 16px;
}

.segmented {
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f5f8f7;
  margin-bottom: 14px;
}

.segmented label {
  display: block;
}

.segmented input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segmented span {
  display: grid;
  place-items: center;
  min-height: 34px;
  min-width: 112px;
  border-radius: 6px;
  color: var(--muted);
  font-weight: 900;
}

.segmented input:checked + span {
  background: #fff;
  color: var(--teal);
  box-shadow: 0 1px 6px rgba(16, 42, 37, 0.1);
}

.key-box {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.key-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.key-title span {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.logs-panel { max-height: min(760px, 90vh); overflow: auto; }
.logs-list { display: grid; gap: 8px; }

.log-row {
  display: grid;
  grid-template-columns: 140px 110px 80px minmax(0, 1fr);
  gap: 10px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  align-items: center;
}

.credential-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  max-width: min(420px, calc(100% - 36px));
  background: var(--deep);
  color: #fff;
  padding: 13px 15px;
  border-radius: 8px;
  box-shadow: var(--shadow);
  font-weight: 800;
  z-index: 50;
}

@media (max-width: 980px) {
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .doctor-row { grid-template-columns: 1fr; }
  .row-actions { justify-content: flex-start; }
  .cost-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .topbar { height: auto; min-height: 68px; align-items: flex-start; padding-top: 14px; padding-bottom: 14px; }
  .top-actions { flex-wrap: wrap; justify-content: flex-end; }
  .auth-card { grid-template-columns: 1fr; }
  .controls, .metrics, .form-grid, .key-grid, .credit-tools, .cost-grid, .credential-grid { grid-template-columns: 1fr; }
  .workspace-head { align-items: stretch; flex-direction: column; }
  .workspace-head button { width: 100%; }
  .log-row { grid-template-columns: 1fr; }
}
`;

export const ADMIN_JS = `(function () {
  "use strict";

  var COST_LABELS = {
    chat: "Chat",
    lab_analysis: "Lab analysis",
    pdf_analysis: "PDF analysis",
    ecg_analysis: "ECG analysis",
    image_analysis: "Image analysis",
    multimodal_analysis: "Multimodal",
    irm_analysis: "IRM analysis"
  };

  var state = {
    token: localStorage.getItem("medismart_admin_token") || "",
    rows: [],
    plans: {},
    providers: {},
    creditCosts: {},
    query: "",
    provider: "all",
    editingId: ""
  };

  var el = {};

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message, isError) {
    el.toast.textContent = message;
    el.toast.style.background = isError ? "#9e332a" : "#102a25";
    el.toast.classList.remove("hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      el.toast.classList.add("hidden");
    }, 3200);
  }

  async function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign({
      "Content-Type": "application/json",
      "X-Admin-Token": state.token
    }, options.headers || {});
    var request = {
      method: options.method || "GET",
      headers: headers
    };
    if (options.body !== undefined) request.body = JSON.stringify(options.body);
    var response = await fetch(path, request);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || response.statusText || "Request failed");
    return data;
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = "Working";
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  }

  function showApp(isReady) {
    el.authPanel.classList.toggle("hidden", isReady);
    el.app.classList.toggle("hidden", !isReady);
    el.refreshButton.classList.toggle("hidden", !isReady);
    el.logoutButton.classList.toggle("hidden", !isReady);
  }

  async function loadData() {
    var data = await apiFetch("/api/admin/doctors");
    state.rows = data.rows || [];
    state.plans = data.plans || {};
    state.providers = data.providers || {};
    state.creditCosts = data.credit_costs || {};
    renderProviderFilter();
    renderPlans();
    renderMetrics();
    renderRows();
    renderCosts();
  }

  function renderProviderFilter() {
    var current = el.providerFilter.value || state.provider || "all";
    var html = '<option value="all">All providers</option>';
    Object.keys(state.providers).forEach(function (key) {
      html += '<option value="' + escapeHtml(key) + '">' + escapeHtml(state.providers[key].label) + '</option>';
    });
    el.providerFilter.innerHTML = html;
    el.providerFilter.value = state.providers[current] ? current : "all";
  }

  function renderPlans() {
    var html = "";
    Object.keys(state.plans).forEach(function (key) {
      var plan = state.plans[key];
      html += '<option value="' + escapeHtml(key) + '">' + escapeHtml(plan.label) + '</option>';
    });
    el.doctorPlan.innerHTML = html;
  }

  function filteredRows() {
    var q = state.query.trim().toLowerCase();
    return state.rows.filter(function (row) {
      var providerOk = state.provider === "all" || row.ai_provider === state.provider;
      var hay = [row.name, row.email, row.doctor_id, row.plan_label, row.ai_provider_label].join(" ").toLowerCase();
      var queryOk = !q || hay.indexOf(q) !== -1;
      return providerOk && queryOk;
    });
  }

  function renderMetrics() {
    var total = state.rows.length;
    var active = state.rows.filter(function (row) { return row.active; }).length;
    var used = state.rows.reduce(function (sum, row) { return sum + (row.used_credits || 0); }, 0);
    var missing = state.rows.filter(function (row) { return !row.has_active_provider_key; }).length;
    var groq = state.rows.filter(function (row) { return row.ai_provider === "groq"; }).length;
    var gemini = state.rows.filter(function (row) { return row.ai_provider === "gemini"; }).length;
    el.metrics.innerHTML =
      metric("Doctors", total) +
      metric("Active", active) +
      metric("Credits used", used) +
      metric("Providers", "G " + groq + " / M " + gemini + (missing ? " / " + missing + " missing" : ""));
  }

  function metric(label, value) {
    return '<article class="metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderRows() {
    var rows = filteredRows();
    el.doctorCount.textContent = rows.length + (rows.length === 1 ? " record" : " records");
    if (!rows.length) {
      el.doctorRows.innerHTML = '<div class="empty">No doctors match the current view.</div>';
      return;
    }
    el.doctorRows.innerHTML = rows.map(renderDoctorRow).join("");
  }

  function renderDoctorRow(row) {
    var percent = row.unlimited ? 100 : Math.max(0, Math.min(100, Math.round(((row.monthly_credits - row.remaining_credits) / Math.max(1, row.monthly_credits)) * 100)));
    var statusBadge = row.active ? '<span class="badge teal">Active</span>' : '<span class="badge coral">Inactive</span>';
    var aiBadge = row.ai_enabled ? '<span class="badge teal">AI on</span>' : '<span class="badge coral">AI off</span>';
    var keyBadge = row.has_active_provider_key ? '<span class="badge violet">Key saved</span>' : '<span class="badge amber">Key missing</span>';
    return '' +
      '<article class="doctor-row" data-id="' + escapeHtml(row.doctor_id) + '">' +
        '<div class="doctor-main">' +
          '<strong>' + escapeHtml(row.name || "Dr") + '</strong>' +
          '<span>' + escapeHtml(row.email || "No email") + '</span>' +
          '<span>' + escapeHtml(row.doctor_id) + '</span>' +
        '</div>' +
        '<div>' +
          '<div class="badge-row">' + statusBadge + aiBadge + '</div>' +
          '<span class="subtle">' + escapeHtml(row.plan_label) + '</span>' +
        '</div>' +
        '<div>' +
          '<div class="badge-row"><span class="badge">' + escapeHtml(row.ai_provider_label) + '</span>' + keyBadge + '</div>' +
          '<span class="subtle">' + escapeHtml(row.ai_model) + '</span>' +
        '</div>' +
        '<div>' +
          '<span class="subtle">' + escapeHtml(row.used_credits) + ' used / ' + escapeHtml(row.unlimited ? "unlimited" : row.monthly_credits) + '</span>' +
          '<div class="progress" aria-hidden="true"><span style="width:' + percent + '%"></span></div>' +
          '<div class="row-actions">' +
            '<button class="ghost" type="button" data-action="logs">Logs</button>' +
            '<button class="ghost" type="button" data-action="edit">Edit</button>' +
            '<button class="ghost danger" type="button" data-action="delete">Delete</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderCosts() {
    var html = "";
    Object.keys(state.creditCosts).forEach(function (key) {
      html += '<label><span>' + escapeHtml(COST_LABELS[key] || key) + '</span><input data-cost="' + escapeHtml(key) + '" type="number" min="0" step="1" value="' + escapeHtml(state.creditCosts[key]) + '"></label>';
    });
    el.costGrid.innerHTML = html;
  }

  function findDoctor(id) {
    return state.rows.find(function (row) { return row.doctor_id === id; });
  }

  function openDoctorDialog(row) {
    state.editingId = row ? row.doctor_id : "";
    el.doctorForm.reset();
    el.doctorDialogMode.textContent = row ? "Edit" : "Create";
    el.doctorDialogTitle.textContent = row ? row.name || "Doctor" : "New doctor";
    el.doctorId.value = row ? row.doctor_id : "";
    el.doctorName.value = row ? row.name || "" : "";
    el.doctorEmail.value = row ? row.email || "" : "";
    el.doctorPlan.value = row ? row.plan_name : firstKey(state.plans);
    el.doctorSecret.value = "";
    el.secretField.classList.toggle("hidden", !!row);
    el.doctorActive.checked = row ? !!row.active : true;
    el.doctorAiEnabled.checked = row ? !!row.ai_enabled : true;
    setProvider(row ? row.ai_provider : "groq");
    el.groqModel.value = row ? row.groq_model || defaultModel("groq") : defaultModel("groq");
    el.geminiModel.value = row ? row.gemini_model || defaultModel("gemini") : defaultModel("gemini");
    el.groqApiKey.value = "";
    el.geminiApiKey.value = "";
    el.clearGroqKey.checked = false;
    el.clearGeminiKey.checked = false;
    el.clearGroqWrap.classList.toggle("hidden", !row);
    el.clearGeminiWrap.classList.toggle("hidden", !row);
    el.groqKeyState.textContent = row && row.has_groq_key ? "Saved" : "No key";
    el.geminiKeyState.textContent = row && row.has_gemini_key ? "Saved" : "No key";
    el.addCredits.value = "";
    el.setUsedCredits.value = "";
    el.resetMonthly.checked = false;
    el.doctorDialog.showModal();
  }

  function firstKey(obj) {
    var keys = Object.keys(obj || {});
    return keys[0] || "";
  }

  function defaultModel(provider) {
    return state.providers[provider] ? state.providers[provider].default_model : "";
  }

  function setProvider(provider) {
    var radio = document.querySelector('input[name="ai_provider"][value="' + provider + '"]');
    if (radio) radio.checked = true;
  }

  function selectedProvider() {
    var checked = document.querySelector('input[name="ai_provider"]:checked');
    return checked ? checked.value : "groq";
  }

  async function saveDoctor(event) {
    event.preventDefault();
    var button = el.doctorForm.querySelector('button[type="submit"]');
    setBusy(button, true);
    try {
      var body = {
        name: el.doctorName.value.trim(),
        email: el.doctorEmail.value.trim(),
        plan_name: el.doctorPlan.value,
        active: el.doctorActive.checked,
        ai_enabled: el.doctorAiEnabled.checked,
        ai_provider: selectedProvider(),
        groq_model: el.groqModel.value.trim(),
        gemini_model: el.geminiModel.value.trim()
      };
      if (!state.editingId && el.doctorSecret.value.trim()) body.secret = el.doctorSecret.value.trim();
      if (el.groqApiKey.value.trim()) body.groq_api_key = el.groqApiKey.value.trim();
      if (el.geminiApiKey.value.trim()) body.gemini_api_key = el.geminiApiKey.value.trim();
      if (state.editingId && el.clearGroqKey.checked) body.clear_groq_api_key = true;
      if (state.editingId && el.clearGeminiKey.checked) body.clear_gemini_api_key = true;
      if (el.addCredits.value !== "") body.add_credits = parseInt(el.addCredits.value, 10) || 0;
      if (el.setUsedCredits.value !== "") body.set_used_credits = parseInt(el.setUsedCredits.value, 10) || 0;
      if (el.resetMonthly.checked) body.reset_monthly = true;

      var result;
      if (state.editingId) {
        result = await apiFetch("/api/admin/doctors/" + encodeURIComponent(state.editingId), { method: "PATCH", body: body });
      } else {
        result = await apiFetch("/api/admin/doctors", { method: "POST", body: body });
      }
      el.doctorDialog.close();
      await loadData();
      showToast("Doctor saved");
      if (!state.editingId && result.doctor) showCredentials(result.doctor);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(button, false);
    }
  }

  function showCredentials(doctor) {
    el.createdDoctorId.value = doctor.doctor_id || doctor.id || "";
    el.createdDoctorSecret.value = doctor.secret || "";
    el.credentialsDialog.showModal();
  }

  async function deleteDoctor(id) {
    var row = findDoctor(id);
    if (!window.confirm("Delete " + ((row && row.name) || "this doctor") + "?")) return;
    try {
      await apiFetch("/api/admin/doctors/" + encodeURIComponent(id), { method: "DELETE" });
      await loadData();
      showToast("Doctor deleted");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function openLogs(id) {
    var row = findDoctor(id);
    el.logsTitle.textContent = row ? row.name || "Logs" : "Logs";
    el.logsRows.innerHTML = '<div class="empty">Loading logs.</div>';
    el.logsDialog.showModal();
    try {
      var data = await apiFetch("/api/admin/doctors/" + encodeURIComponent(id) + "/logs");
      var logs = data.rows || [];
      if (!logs.length) {
        el.logsRows.innerHTML = '<div class="empty">No activity yet.</div>';
        return;
      }
      el.logsRows.innerHTML = logs.map(function (log) {
        return '<article class="log-row">' +
          '<span class="subtle">' + escapeHtml((log.created_at || "").replace("T", " ").slice(0, 16)) + '</span>' +
          '<strong>' + escapeHtml(log.action_type || "action") + '</strong>' +
          '<span class="badge ' + (log.success ? "teal" : "coral") + '">' + escapeHtml(log.credits_used || 0) + '</span>' +
          '<span class="subtle">' + escapeHtml(log.details || "") + '</span>' +
        '</article>';
      }).join("");
    } catch (error) {
      el.logsRows.innerHTML = '<div class="empty">' + escapeHtml(error.message) + '</div>';
    }
  }

  async function saveCosts() {
    setBusy(el.saveCostsButton, true);
    try {
      var body = {};
      el.costGrid.querySelectorAll("[data-cost]").forEach(function (input) {
        body[input.dataset.cost] = parseInt(input.value, 10) || 0;
      });
      var data = await apiFetch("/api/admin/credit-costs", { method: "PUT", body: body });
      state.creditCosts = data.credit_costs || body;
      renderCosts();
      showToast("Credit costs saved");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(el.saveCostsButton, false);
    }
  }

  function copyFromInput(id) {
    var input = byId(id);
    if (!input) return;
    input.select();
    var value = input.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        showToast("Copied");
      }).catch(function () {
        document.execCommand("copy");
        showToast("Copied");
      });
    } else {
      document.execCommand("copy");
      showToast("Copied");
    }
  }

  function closeDialog(id) {
    var dialog = byId(id);
    if (dialog && dialog.open) dialog.close();
  }

  function bindEvents() {
    el.authForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var button = el.authForm.querySelector("button");
      state.token = el.adminToken.value.trim();
      setBusy(button, true);
      try {
        await apiFetch("/api/admin/health");
        localStorage.setItem("medismart_admin_token", state.token);
        showApp(true);
        await loadData();
        showToast("Connected");
      } catch (error) {
        showToast(error.message, true);
      } finally {
        setBusy(button, false);
      }
    });

    el.refreshButton.addEventListener("click", function () {
      loadData().then(function () {
        showToast("Refreshed");
      }).catch(function (error) {
        showToast(error.message, true);
      });
    });

    el.logoutButton.addEventListener("click", function () {
      state.token = "";
      localStorage.removeItem("medismart_admin_token");
      el.adminToken.value = "";
      showApp(false);
    });

    el.newDoctorButton.addEventListener("click", function () { openDoctorDialog(null); });
    el.doctorForm.addEventListener("submit", saveDoctor);
    el.saveCostsButton.addEventListener("click", saveCosts);

    el.searchInput.addEventListener("input", function () {
      state.query = el.searchInput.value;
      renderRows();
    });

    el.providerFilter.addEventListener("change", function () {
      state.provider = el.providerFilter.value;
      renderRows();
    });

    el.doctorRows.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) return;
      var row = event.target.closest(".doctor-row");
      if (!row) return;
      var id = row.dataset.id;
      if (button.dataset.action === "edit") openDoctorDialog(findDoctor(id));
      if (button.dataset.action === "logs") openLogs(id);
      if (button.dataset.action === "delete") deleteDoctor(id);
    });

    document.addEventListener("click", function (event) {
      var close = event.target.closest("[data-close-dialog]");
      if (close) closeDialog(close.dataset.closeDialog);
      var copy = event.target.closest("[data-copy]");
      if (copy) copyFromInput(copy.dataset.copy);
    });
  }

  async function autoConnect() {
    if (!state.token) {
      showApp(false);
      return;
    }
    el.adminToken.value = state.token;
    showApp(true);
    try {
      await loadData();
    } catch (error) {
      showApp(false);
      showToast(error.message, true);
    }
  }

  function init() {
    [
      "authPanel", "authForm", "adminToken", "app", "refreshButton", "logoutButton",
      "newDoctorButton", "metrics", "providerFilter", "searchInput", "doctorCount",
      "doctorRows", "costGrid", "saveCostsButton", "toast", "doctorDialog",
      "doctorForm", "doctorDialogMode", "doctorDialogTitle", "doctorId",
      "doctorName", "doctorEmail", "doctorPlan", "secretField", "doctorSecret",
      "doctorActive", "doctorAiEnabled", "groqApiKey", "geminiApiKey",
      "groqModel", "geminiModel", "groqKeyState", "geminiKeyState",
      "clearGroqWrap", "clearGeminiWrap", "clearGroqKey", "clearGeminiKey",
      "addCredits", "setUsedCredits", "resetMonthly", "logsDialog", "logsTitle",
      "logsRows", "credentialsDialog", "createdDoctorId", "createdDoctorSecret"
    ].forEach(function (id) {
      el[id] = byId(id);
    });
    bindEvents();
    autoConnect();
  }

  document.addEventListener("DOMContentLoaded", init);
})();`;
