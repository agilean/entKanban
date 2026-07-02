const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Agilean";
const config = window.LEAN_GAME_CONFIG || {};

const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminUsername = document.querySelector("#adminUsername");
const adminPassword = document.querySelector("#adminPassword");
const loginFeedback = document.querySelector("#loginFeedback");
const logoutBtn = document.querySelector("#logoutBtn");
const bankStats = document.querySelector("#bankStats");
const questionLists = document.querySelector("#questionLists");
const questionsTabBtn = document.querySelector("#questionsTabBtn");
const scoresTabBtn = document.querySelector("#scoresTabBtn");
const questionsView = document.querySelector("#questionsView");
const scoresView = document.querySelector("#scoresView");
const scoresTable = document.querySelector("#scoresTable");

adminLoginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", logout);
questionsTabBtn.addEventListener("click", () => showAdminView("questions"));
scoresTabBtn.addEventListener("click", () => showAdminView("scores"));

importTransferredScores();
showLogin();

function handleLogin(event) {
  event.preventDefault();

  if (adminUsername.value === ADMIN_USERNAME && adminPassword.value === ADMIN_PASSWORD) {
    adminLoginForm.reset();
    loginFeedback.textContent = "";
    showDashboard();
    return;
  }

  loginFeedback.textContent = "用户名或密码不正确。";
}

function logout() {
  showLogin();
}

function showLogin() {
  document.body.classList.add("admin-locked");
  document.body.classList.remove("admin-authenticated");
  dashboardPanel.hidden = true;
  loginPanel.hidden = false;
  bankStats.innerHTML = "";
  questionLists.innerHTML = "";
  scoresTable.innerHTML = "";
  adminUsername.focus();
}

function showDashboard() {
  document.body.classList.remove("admin-locked");
  document.body.classList.add("admin-authenticated");
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  renderStats();
  renderQuestionLists();
  showAdminView("questions");
}

function renderStats() {
  const labels = { low: "低", medium: "中", high: "高" };
  bankStats.innerHTML = Object.entries(labels)
    .map(([key, label]) => {
      const memoryCount = window.questionBank.memory[key].length;
      const leanCount = window.questionBank.lean[key].length;
      return `<div><strong>${label}</strong><span>记忆 ${memoryCount} / 精益 ${leanCount}</span></div>`;
    })
    .join("");
}

function renderQuestionLists() {
  const labels = { low: "低难度", medium: "中难度", high: "高难度" };
  questionLists.innerHTML = Object.entries(labels)
    .map(([key, label]) => {
      const memoryItems = window.questionBank.memory[key]
        .map((item) => `<li>${item.question} <strong>${item.answer}</strong></li>`)
        .join("");
      const leanItems = window.questionBank.lean[key]
        .map((item) => `<li>${item.question} <strong>${item.answer}</strong></li>`)
        .join("");

      return `
        <article class="question-list">
          <h2>${label}</h2>
          <h3>记忆题</h3>
          <ol>${memoryItems}</ol>
          <h3>精益题</h3>
          <ol>${leanItems}</ol>
        </article>
      `;
    })
    .join("");
}

function showAdminView(view) {
  const isScores = view === "scores";
  questionsView.hidden = isScores;
  scoresView.hidden = !isScores;
  questionsTabBtn.classList.toggle("active", !isScores);
  scoresTabBtn.classList.toggle("active", isScores);
  questionsTabBtn.setAttribute("aria-pressed", String(!isScores));
  scoresTabBtn.setAttribute("aria-pressed", String(isScores));

  if (isScores) {
    renderScores();
  }
}

async function renderScores() {
  scoresTable.innerHTML = `<p class="empty-state">正在读取成绩记录...</p>`;

  try {
    const contacts = await loadScores();

    if (contacts.length === 0) {
      scoresTable.innerHTML = `<p class="empty-state">暂无通关提交记录。</p>`;
      return;
    }

    scoresTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>阶段</th>
            <th>姓名</th>
            <th>手机号</th>
            <th>公司/部门</th>
            <th>得分</th>
            <th>答题时间</th>
            <th>提交时间</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(renderScoreRow).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    scoresTable.innerHTML = `<p class="empty-state">成绩读取失败，请检查线上数据库配置。</p>`;
  }
}

async function loadScores() {
  if (isServerApiEnabled()) {
    return loadServerApiScores();
  }

  if (isRemoteScoresEnabled()) {
    return loadRemoteScores();
  }

  return JSON.parse(localStorage.getItem("leanGameContacts") || "[]");
}

async function loadServerApiScores() {
  const response = await fetch(`${config.apiBase}/score-list`);

  if (!response.ok) {
    throw new Error("Server score load failed");
  }

  return response.json();
}

async function loadRemoteScores() {
  const table = config.scoresTable || "lean_game_scores";
  const response = await fetch(
      `${config.supabaseUrl}/rest/v1/${table}?select=stage,stage_name,score,name,phone,organization,completed_at,duration_seconds&order=completed_at.desc`,
    {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("Remote score load failed");
  }

  const rows = await response.json();
  return rows.map((row) => ({
    name: row.name,
    stage: row.stage,
    stageName: row.stage_name,
    score: row.score,
    phone: row.phone,
    organization: row.organization,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds
  }));
}

function isRemoteScoresEnabled() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

function isServerApiEnabled() {
  return Boolean(config.apiBase && window.location.protocol !== "file:");
}

function importTransferredScores() {
  if (!window.name) {
    return;
  }

  try {
    const payload = JSON.parse(window.name);
    if (payload.type !== "leanGameScoresTransfer" || !Array.isArray(payload.contacts)) {
      return;
    }

    const contacts = JSON.parse(localStorage.getItem("leanGameContacts") || "[]");
    const mergedContacts = mergeContacts(contacts, payload.contacts);
    localStorage.setItem("leanGameContacts", JSON.stringify(mergedContacts));
    window.name = "";
  } catch (error) {
    window.name = "";
  }
}

function mergeContacts(existingContacts, incomingContacts) {
  const seen = new Set();
  return [...existingContacts, ...incomingContacts].filter((contact) => {
    const key = `${contact.phone || ""}-${contact.completedAt || ""}-${contact.durationSeconds || ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function renderScoreRow(contact) {
  return `
    <tr>
      <td>${escapeHtml(contact.stageName || contact.stage || "知识闯关：认识精益")}</td>
      <td>${escapeHtml(contact.name || "")}</td>
      <td>${escapeHtml(contact.phone || "")}</td>
      <td>${escapeHtml(contact.organization || "")}</td>
      <td>${formatScore(contact)}</td>
      <td>${formatDuration(Number(contact.durationSeconds || 0))}</td>
      <td>${formatDate(contact.completedAt)}</td>
    </tr>
  `;
}

function formatDuration(seconds) {
  if (!seconds) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}分${restSeconds}秒` : `${restSeconds}秒`;
}

function formatScore(contact) {
  if (contact.score === undefined || contact.score === null || contact.score === "") {
    return "-";
  }

  return contact.stage === "Lean System Lab" ? `${contact.score}/5` : `${contact.score}/10`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
