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
          <small>AI Control</small>
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
          <h1>Keys, doctors, and usage limits.</h1>
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
          <h1>Admin Panel</h1>
        </div>
        <div class="workspace-actions">
          <button id="newKeyButton" type="button">Add API key</button>
          <button id="newDoctorButton" type="button">New doctor</button>
        </div>
      </section>

      <section class="metrics" id="metrics"></section>

      <section class="surface">
        <div class="surface-head">
          <h2>Named API Keys</h2>
          <span id="keyCount">0 keys</span>
        </div>
        <div class="key-list" id="keyRows"></div>
      </section>

      <section class="controls">
        <label class="search-box">
          <span>Search doctors</span>
          <input id="searchInput" type="search" placeholder="Email, doctor ID, or key name">
        </label>
        <label>
          <span>Assigned key</span>
          <select id="keyFilter">
            <option value="all">All keys</option>
          </select>
        </label>
      </section>

      <section class="surface">
        <div class="surface-head">
          <h2>Doctors</h2>
          <span id="doctorCount">0 doctors</span>
        </div>
        <div class="doctor-list" id="doctorRows"></div>
      </section>

      <section class="surface compact">
        <div class="surface-head">
          <h2>Action Costs</h2>
          <button class="ghost" id="saveCostsButton" type="button">Save costs</button>
        </div>
        <div class="cost-grid" id="costGrid"></div>
      </section>
    </main>
  </div>

  <dialog class="modal" id="keyDialog">
    <form class="modal-panel" id="keyForm">
      <div class="modal-head">
        <div>
          <p class="eyebrow" id="keyDialogMode">Create</p>
          <h2 id="keyDialogTitle">API key</h2>
        </div>
        <button class="icon-button" type="button" data-close-dialog="keyDialog" aria-label="Close">x</button>
      </div>

      <input id="keyId" type="hidden">
      <div class="form-grid">
        <label>
          <span>Name</span>
          <input id="keyName" required placeholder="Groq main, Gemini backup">
        </label>
        <label>
          <span>Provider</span>
          <select id="keyProvider"></select>
        </label>
        <label>
          <span>Model</span>
          <input id="keyModel" required>
        </label>
        <label>
          <span>API key</span>
          <input id="keySecret" type="password" autocomplete="off" placeholder="Paste key">
        </label>
      </div>
      <div class="toggle-row">
        <label class="toggle">
          <input id="keyActive" type="checkbox" checked>
          <span></span>
          Active
        </label>
        <label class="mini-check hidden" id="clearKeyWrap">
          <input id="clearKeySecret" type="checkbox">
          Clear saved secret
        </label>
      </div>
      <div class="modal-actions">
        <button class="ghost" type="button" data-close-dialog="keyDialog">Cancel</button>
        <button type="submit">Save key</button>
      </div>
    </form>
  </dialog>

  <dialog class="modal" id="doctorDialog">
    <form class="modal-panel" id="doctorForm">
      <div class="modal-head">
        <div>
          <p class="eyebrow" id="doctorDialogMode">Create</p>
          <h2 id="doctorDialogTitle">Doctor</h2>
        </div>
        <button class="icon-button" type="button" data-close-dialog="doctorDialog" aria-label="Close">x</button>
      </div>

      <input id="doctorId" type="hidden">
      <div class="form-grid">
        <label>
          <span>Email</span>
          <input id="doctorEmail" type="email" required>
        </label>
        <label>
          <span>Assigned API key</span>
          <select id="doctorAssignedKey"></select>
        </label>
        <label>
          <span>Monthly usage</span>
          <input id="doctorMonthlyLimit" type="number" min="0" step="1" required>
        </label>
        <label>
          <span>Daily usage</span>
          <input id="doctorDailyLimit" type="number" min="0" step="1" required>
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

      <section class="usage-tools hidden" id="doctorUsageTools">
        <div class="form-grid">
          <label>
            <span>Set monthly used</span>
            <input id="setMonthlyUsed" type="number" min="0" step="1" placeholder="Leave empty">
          </label>
          <label>
            <span>Set daily used</span>
            <input id="setDailyUsed" type="number" min="0" step="1" placeholder="Leave empty">
          </label>
        </div>
        <div class="toggle-row">
          <label class="mini-check">
            <input id="resetMonthly" type="checkbox">
            Reset monthly usage
          </label>
          <label class="mini-check">
            <input id="resetDaily" type="checkbox">
            Reset daily usage
          </label>
        </div>
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
  --ink: #13201d;
  --muted: #66736e;
  --line: #dbe5e1;
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
  --blue-soft: #e4f1ff;
  --blue: #2463a6;
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

button, input, select { font: inherit; }

button {
  border: 0;
  border-radius: 8px;
  min-height: 40px;
  padding: 0 16px;
  background: var(--teal);
  color: #fff;
  font-weight: 800;
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
.hidden { display: none !important; }

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

.topbar {
  min-height: 72px;
  padding: 14px clamp(16px, 4vw, 40px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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

.brand strong, .brand small { display: block; line-height: 1.1; }
.brand small { color: var(--muted); font-size: 12px; margin-top: 3px; }

.top-actions, .workspace-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
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

.metric span { color: var(--muted); font-size: 13px; }
.metric strong { display: block; margin-top: 8px; font-size: 28px; line-height: 1; }

.controls {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 240px;
  gap: 12px;
  margin-bottom: 14px;
}

label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
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

.surface-head h2 {
  margin: 0;
  font-size: 18px;
}

.surface-head span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.key-list, .doctor-list { display: grid; }

.key-row, .doctor-row {
  display: grid;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--line);
}

.key-row:first-child, .doctor-row:first-child { border-top: 0; }
.key-row { grid-template-columns: minmax(220px, 1.1fr) minmax(190px, 0.9fr) minmax(150px, 0.7fr) minmax(180px, auto); }
.doctor-row { grid-template-columns: minmax(240px, 1.1fr) minmax(190px, 0.9fr) minmax(280px, 1fr) minmax(190px, auto); }

.row-main strong {
  display: block;
  font-size: 16px;
  margin-bottom: 5px;
}

.row-main span, .subtle {
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
  font-weight: 900;
}

.badge.teal { background: var(--teal-soft); color: #006a5d; }
.badge.coral { background: var(--coral-soft); color: #9e332a; }
.badge.amber { background: var(--amber-soft); color: var(--amber); }
.badge.violet { background: var(--violet-soft); color: var(--violet); }
.badge.blue { background: var(--blue-soft); color: var(--blue); }

.usage-stack { display: grid; gap: 10px; }
.usage-line { display: grid; gap: 5px; }
.usage-line span { color: var(--muted); font-size: 13px; }

.progress {
  height: 8px;
  border-radius: 999px;
  background: #edf2f0;
  overflow: hidden;
}

.progress span {
  display: block;
  height: 100%;
  min-width: 2px;
  background: var(--teal);
}

.progress.daily span { background: var(--blue); }

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
  width: min(860px, calc(100% - 24px));
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.toggle-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 16px 0 0;
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

.usage-tools {
  border-top: 1px solid var(--line);
  padding-top: 16px;
  margin-top: 16px;
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

@media (max-width: 1040px) {
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .key-row, .doctor-row { grid-template-columns: 1fr; }
  .row-actions { justify-content: flex-start; }
  .cost-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .topbar { align-items: flex-start; }
  .auth-card, .controls, .metrics, .form-grid, .cost-grid, .credential-grid { grid-template-columns: 1fr; }
  .workspace-head { align-items: stretch; flex-direction: column; }
  .workspace-actions, .workspace-actions button { width: 100%; }
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
    apiKeys: [],
    providers: {},
    creditCosts: {},
    defaults: { monthly_limit: 500, daily_limit: 50 },
    query: "",
    keyFilter: "all",
    editingDoctorId: "",
    editingKeyId: ""
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
    state.apiKeys = data.api_keys || [];
    state.providers = data.providers || {};
    state.creditCosts = data.credit_costs || {};
    state.defaults = data.default_limits || state.defaults;
    renderProviderOptions();
    renderKeyFilter();
    renderDoctorKeyOptions();
    renderMetrics();
    renderKeys();
    renderDoctors();
    renderCosts();
  }

  function renderProviderOptions() {
    var html = "";
    Object.keys(state.providers).forEach(function (key) {
      html += '<option value="' + escapeHtml(key) + '">' + escapeHtml(state.providers[key].label) + '</option>';
    });
    el.keyProvider.innerHTML = html;
  }

  function renderKeyFilter() {
    var current = state.keyFilter || "all";
    var html = '<option value="all">All keys</option><option value="">No key assigned</option>';
    state.apiKeys.forEach(function (key) {
      html += '<option value="' + escapeHtml(key.id) + '">' + escapeHtml(key.name) + '</option>';
    });
    el.keyFilter.innerHTML = html;
    el.keyFilter.value = current === "all" || current === "" || findKey(current) ? current : "all";
  }

  function renderDoctorKeyOptions() {
    var html = '<option value="">No key</option>';
    state.apiKeys.forEach(function (key) {
      html += '<option value="' + escapeHtml(key.id) + '">' + escapeHtml(key.name) + ' - ' + escapeHtml(key.provider_label) + '</option>';
    });
    el.doctorAssignedKey.innerHTML = html;
  }

  function renderMetrics() {
    var totalDoctors = state.rows.length;
    var activeDoctors = state.rows.filter(function (row) { return row.active; }).length;
    var totalKeys = state.apiKeys.length;
    var monthlyUsed = state.rows.reduce(function (sum, row) { return sum + (row.monthly_used || 0); }, 0);
    var dailyUsed = state.rows.reduce(function (sum, row) { return sum + (row.daily_used || 0); }, 0);
    el.metrics.innerHTML =
      metric("API keys", totalKeys) +
      metric("Doctors", totalDoctors) +
      metric("Active doctors", activeDoctors) +
      metric("Used today", dailyUsed + " / " + monthlyUsed + " month");
  }

  function metric(label, value) {
    return '<article class="metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function renderKeys() {
    el.keyCount.textContent = state.apiKeys.length + (state.apiKeys.length === 1 ? " key" : " keys");
    if (!state.apiKeys.length) {
      el.keyRows.innerHTML = '<div class="empty">No API keys yet.</div>';
      return;
    }
    el.keyRows.innerHTML = state.apiKeys.map(renderKeyRow).join("");
  }

  function renderKeyRow(key) {
    var status = key.active ? '<span class="badge teal">Active</span>' : '<span class="badge coral">Inactive</span>';
    var secret = key.has_key ? '<span class="badge violet">Secret saved</span>' : '<span class="badge amber">No secret</span>';
    return '' +
      '<article class="key-row" data-id="' + escapeHtml(key.id) + '">' +
        '<div class="row-main">' +
          '<strong>' + escapeHtml(key.name) + '</strong>' +
          '<span>' + escapeHtml(key.id) + '</span>' +
        '</div>' +
        '<div>' +
          '<div class="badge-row"><span class="badge blue">' + escapeHtml(key.provider_label) + '</span>' + status + '</div>' +
          '<span class="subtle">' + escapeHtml(key.model) + '</span>' +
        '</div>' +
        '<div>' +
          '<div class="badge-row">' + secret + '</div>' +
          '<span class="subtle">' + escapeHtml(key.assigned_count || 0) + ' assigned</span>' +
        '</div>' +
        '<div class="row-actions">' +
          '<button class="ghost" type="button" data-action="edit-key">Edit</button>' +
          '<button class="ghost danger" type="button" data-action="delete-key">Delete</button>' +
        '</div>' +
      '</article>';
  }

  function filteredDoctors() {
    var q = state.query.trim().toLowerCase();
    return state.rows.filter(function (row) {
      var keyOk = state.keyFilter === "all" || row.assigned_api_key_id === state.keyFilter;
      var hay = [row.name, row.email, row.doctor_id, row.assigned_api_key_name, row.ai_provider_label].join(" ").toLowerCase();
      return keyOk && (!q || hay.indexOf(q) !== -1);
    });
  }

  function renderDoctors() {
    var rows = filteredDoctors();
    el.doctorCount.textContent = rows.length + (rows.length === 1 ? " doctor" : " doctors");
    if (!rows.length) {
      el.doctorRows.innerHTML = '<div class="empty">No doctors match the current view.</div>';
      return;
    }
    el.doctorRows.innerHTML = rows.map(renderDoctorRow).join("");
  }

  function renderDoctorRow(row) {
    var monthlyPercent = percent(row.monthly_used, row.monthly_limit);
    var dailyPercent = percent(row.daily_used, row.daily_limit);
    var statusBadge = row.active ? '<span class="badge teal">Active</span>' : '<span class="badge coral">Inactive</span>';
    var aiBadge = row.ai_enabled ? '<span class="badge teal">AI on</span>' : '<span class="badge coral">AI off</span>';
    var keyBadge = row.has_assigned_api_key && row.assigned_api_key_active ? '<span class="badge violet">Ready</span>' : '<span class="badge amber">Needs key</span>';
    return '' +
      '<article class="doctor-row" data-id="' + escapeHtml(row.doctor_id) + '">' +
        '<div class="row-main">' +
          '<strong>' + escapeHtml(row.email || "No email") + '</strong>' +
          '<span>' + escapeHtml(row.doctor_id) + '</span>' +
          '<div class="badge-row">' + statusBadge + aiBadge + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="badge-row">' + keyBadge + '</div>' +
          '<span class="subtle">' + escapeHtml(row.assigned_api_key_name || "No key assigned") + '</span>' +
          '<span class="subtle">' + escapeHtml(row.ai_provider_label || "") + ' ' + escapeHtml(row.ai_model || "") + '</span>' +
        '</div>' +
        '<div class="usage-stack">' +
          usageLine("Month", row.monthly_used, row.monthly_limit, monthlyPercent, "") +
          usageLine("Today", row.daily_used, row.daily_limit, dailyPercent, "daily") +
        '</div>' +
        '<div class="row-actions">' +
          '<button class="ghost" type="button" data-action="logs">Logs</button>' +
          '<button class="ghost" type="button" data-action="edit-doctor">Edit</button>' +
          '<button class="ghost danger" type="button" data-action="delete-doctor">Delete</button>' +
        '</div>' +
      '</article>';
  }

  function usageLine(label, used, limit, width, extraClass) {
    return '<div class="usage-line"><span>' + escapeHtml(label) + ': ' + escapeHtml(used || 0) + ' / ' + escapeHtml(limit || 0) + '</span><div class="progress ' + extraClass + '"><span style="width:' + width + '%"></span></div></div>';
  }

  function percent(used, limit) {
    if (!limit) return 0;
    return Math.max(0, Math.min(100, Math.round(((used || 0) / limit) * 100)));
  }

  function renderCosts() {
    var html = "";
    Object.keys(state.creditCosts).forEach(function (key) {
      html += '<label><span>' + escapeHtml(COST_LABELS[key] || key) + '</span><input data-cost="' + escapeHtml(key) + '" type="number" min="0" step="1" value="' + escapeHtml(state.creditCosts[key]) + '"></label>';
    });
    el.costGrid.innerHTML = html;
  }

  function findKey(id) {
    return state.apiKeys.find(function (key) { return key.id === id; });
  }

  function findDoctor(id) {
    return state.rows.find(function (row) { return row.doctor_id === id; });
  }

  function defaultModel(provider) {
    return state.providers[provider] ? state.providers[provider].default_model : "";
  }

  function openKeyDialog(key) {
    state.editingKeyId = key ? key.id : "";
    el.keyForm.reset();
    el.keyDialogMode.textContent = key ? "Edit" : "Create";
    el.keyDialogTitle.textContent = key ? key.name : "API key";
    el.keyId.value = key ? key.id : "";
    el.keyName.value = key ? key.name || "" : "";
    el.keyProvider.value = key ? key.provider : "groq";
    el.keyModel.value = key ? key.model || defaultModel(el.keyProvider.value) : defaultModel(el.keyProvider.value);
    el.keySecret.value = "";
    el.keySecret.required = !key;
    el.keySecret.placeholder = key ? "Paste a new key to replace saved secret" : "Paste key";
    el.keyActive.checked = key ? !!key.active : true;
    el.clearKeySecret.checked = false;
    el.clearKeyWrap.classList.toggle("hidden", !key);
    el.keyDialog.showModal();
  }

  function openDoctorDialog(row) {
    state.editingDoctorId = row ? row.doctor_id : "";
    el.doctorForm.reset();
    el.doctorDialogMode.textContent = row ? "Edit" : "Create";
    el.doctorDialogTitle.textContent = row ? row.email || "Doctor" : "Doctor";
    el.doctorId.value = row ? row.doctor_id : "";
    el.doctorEmail.value = row ? row.email || "" : "";
    el.doctorAssignedKey.value = row ? row.assigned_api_key_id || "" : firstKeyId();
    el.doctorMonthlyLimit.value = row ? row.monthly_limit || 0 : state.defaults.monthly_limit || 500;
    el.doctorDailyLimit.value = row ? row.daily_limit || 0 : state.defaults.daily_limit || 50;
    el.doctorActive.checked = row ? !!row.active : true;
    el.doctorAiEnabled.checked = row ? !!row.ai_enabled : true;
    el.setMonthlyUsed.value = "";
    el.setDailyUsed.value = "";
    el.resetMonthly.checked = false;
    el.resetDaily.checked = false;
    el.doctorUsageTools.classList.toggle("hidden", !row);
    el.doctorDialog.showModal();
  }

  function firstKeyId() {
    return state.apiKeys[0] ? state.apiKeys[0].id : "";
  }

  async function saveKey(event) {
    event.preventDefault();
    var button = el.keyForm.querySelector('button[type="submit"]');
    setBusy(button, true);
    try {
      var body = {
        name: el.keyName.value.trim(),
        provider: el.keyProvider.value,
        model: el.keyModel.value.trim(),
        active: el.keyActive.checked
      };
      if (el.keySecret.value.trim()) body.api_key = el.keySecret.value.trim();
      if (state.editingKeyId && el.clearKeySecret.checked) body.clear_api_key = true;

      if (state.editingKeyId) {
        await apiFetch("/api/admin/api-keys/" + encodeURIComponent(state.editingKeyId), { method: "PATCH", body: body });
      } else {
        await apiFetch("/api/admin/api-keys", { method: "POST", body: body });
      }
      el.keyDialog.close();
      await loadData();
      showToast("API key saved");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(button, false);
    }
  }

  async function saveDoctor(event) {
    event.preventDefault();
    var button = el.doctorForm.querySelector('button[type="submit"]');
    setBusy(button, true);
    try {
      var body = {
        email: el.doctorEmail.value.trim(),
        assigned_api_key_id: el.doctorAssignedKey.value,
        monthly_limit: parseInt(el.doctorMonthlyLimit.value, 10) || 0,
        daily_limit: parseInt(el.doctorDailyLimit.value, 10) || 0,
        active: el.doctorActive.checked,
        ai_enabled: el.doctorAiEnabled.checked
      };
      if (state.editingDoctorId) {
        if (el.setMonthlyUsed.value !== "") body.set_monthly_used = parseInt(el.setMonthlyUsed.value, 10) || 0;
        if (el.setDailyUsed.value !== "") body.set_daily_used = parseInt(el.setDailyUsed.value, 10) || 0;
        if (el.resetMonthly.checked) body.reset_monthly = true;
        if (el.resetDaily.checked) body.reset_daily = true;
      }

      var result;
      if (state.editingDoctorId) {
        result = await apiFetch("/api/admin/doctors/" + encodeURIComponent(state.editingDoctorId), { method: "PATCH", body: body });
      } else {
        result = await apiFetch("/api/admin/doctors", { method: "POST", body: body });
      }
      el.doctorDialog.close();
      await loadData();
      showToast("Doctor saved");
      if (!state.editingDoctorId && result.doctor) showCredentials(result.doctor);
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

  async function deleteKey(id) {
    var key = findKey(id);
    if (!window.confirm("Delete " + ((key && key.name) || "this API key") + "?")) return;
    try {
      await apiFetch("/api/admin/api-keys/" + encodeURIComponent(id), { method: "DELETE" });
      await loadData();
      showToast("API key deleted");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function deleteDoctor(id) {
    var row = findDoctor(id);
    if (!window.confirm("Delete " + ((row && row.email) || "this doctor") + "?")) return;
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
    el.logsTitle.textContent = row ? row.email || "Logs" : "Logs";
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
      showToast("Action costs saved");
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

    el.newKeyButton.addEventListener("click", function () { openKeyDialog(null); });
    el.newDoctorButton.addEventListener("click", function () { openDoctorDialog(null); });
    el.keyForm.addEventListener("submit", saveKey);
    el.doctorForm.addEventListener("submit", saveDoctor);
    el.saveCostsButton.addEventListener("click", saveCosts);

    el.keyProvider.addEventListener("change", function () {
      if (!state.editingKeyId) el.keyModel.value = defaultModel(el.keyProvider.value);
    });

    el.searchInput.addEventListener("input", function () {
      state.query = el.searchInput.value;
      renderDoctors();
    });

    el.keyFilter.addEventListener("change", function () {
      state.keyFilter = el.keyFilter.value;
      renderDoctors();
    });

    el.keyRows.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) return;
      var row = event.target.closest(".key-row");
      if (!row) return;
      var id = row.dataset.id;
      if (button.dataset.action === "edit-key") openKeyDialog(findKey(id));
      if (button.dataset.action === "delete-key") deleteKey(id);
    });

    el.doctorRows.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) return;
      var row = event.target.closest(".doctor-row");
      if (!row) return;
      var id = row.dataset.id;
      if (button.dataset.action === "edit-doctor") openDoctorDialog(findDoctor(id));
      if (button.dataset.action === "logs") openLogs(id);
      if (button.dataset.action === "delete-doctor") deleteDoctor(id);
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
      "newKeyButton", "newDoctorButton", "metrics", "keyCount", "keyRows",
      "keyFilter", "searchInput", "doctorCount", "doctorRows", "costGrid",
      "saveCostsButton", "toast", "keyDialog", "keyForm", "keyDialogMode",
      "keyDialogTitle", "keyId", "keyName", "keyProvider", "keyModel",
      "keySecret", "keyActive", "clearKeyWrap", "clearKeySecret", "doctorDialog",
      "doctorForm", "doctorDialogMode", "doctorDialogTitle", "doctorId",
      "doctorEmail", "doctorAssignedKey", "doctorMonthlyLimit", "doctorDailyLimit",
      "doctorActive", "doctorAiEnabled", "doctorUsageTools", "setMonthlyUsed",
      "setDailyUsed", "resetMonthly", "resetDaily", "logsDialog", "logsTitle",
      "logsRows", "credentialsDialog", "createdDoctorId", "createdDoctorSecret"
    ].forEach(function (id) {
      el[id] = byId(id);
    });
    bindEvents();
    autoConnect();
  }

  document.addEventListener("DOMContentLoaded", init);
})();`;
