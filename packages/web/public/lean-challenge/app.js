const TOTAL_ROUNDS = 10;
const MEMORY_SECONDS_BY_DIFFICULTY = {
  low: 4,
  medium: 3,
  high: 3
};
const LEAN_SECONDS = 10;
const HIGH_RECALL_SECONDS = 6;
const config = window.LEAN_GAME_CONFIG || {};

const difficultyConfig = [
  { maxRound: 4, key: "low", label: "低难度" },
  { maxRound: 7, key: "medium", label: "中难度" },
  { maxRound: 10, key: "high", label: "高难度" }
];

const state = {
  round: 1,
  memoryQuestion: null,
  leanQuestion: null,
  timer: null,
  leanTimer: null,
  recallTimer: null,
  startedAt: null,
  completedDurationSeconds: null,
  usedMemoryQuestions: new Set(),
  usedLeanQuestions: new Set(),
  currentUser: null,
  authChecked: false
};

const screens = {
  intro: document.querySelector("#screenIntro"),
  memory: document.querySelector("#screenMemory"),
  lean: document.querySelector("#screenLean"),
  recall: document.querySelector("#screenRecall"),
  result: document.querySelector("#screenResult")
};

const roundLabel = document.querySelector("#roundLabel");
const difficultyLabel = document.querySelector("#difficultyLabel");
const progressFill = document.querySelector("#progressFill");
const memoryQuestionEl = document.querySelector("#memoryQuestion");
const countdownText = document.querySelector("#countdownText");
const leanQuestionEl = document.querySelector("#leanQuestion");
const leanTimerText = document.querySelector("#leanTimerText");
const leanForm = document.querySelector("#leanForm");
const leanFeedback = document.querySelector("#leanFeedback");
const recallPrompt = document.querySelector("#recallPrompt");
const recallForm = document.querySelector("#recallForm");
const recallInput = document.querySelector("#recallInput");
const recallTimerText = document.querySelector("#recallTimerText");
const recallFeedback = document.querySelector("#recallFeedback");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const resultBody = document.querySelector("#resultBody");
const nextBtn = document.querySelector("#nextBtn");
const restartBtn = document.querySelector("#restartBtn");
const correctModal = document.querySelector("#correctModal");
const authBar = document.querySelector("#authBar");
const loginHint = document.querySelector("#loginHint");
const leaderboardList = document.querySelector("#leaderboardList");
const startBtn = document.querySelector("#startBtn");
const adminEntryLink = document.querySelector("#adminEntryLink");

startBtn.addEventListener("click", handleStartClick);
nextBtn.addEventListener("click", nextRound);
restartBtn.addEventListener("click", resetGame);
leanForm.addEventListener("submit", handleLeanAnswer);
recallForm.addEventListener("submit", handleRecallAnswer);
adminEntryLink.addEventListener("click", transferLocalScoresToAdmin);
document.addEventListener("copy", preventCopyDuringMemory);
document.addEventListener("cut", preventCopyDuringMemory);
screens.memory.addEventListener("contextmenu", preventDefault);
screens.memory.addEventListener("dragstart", preventDefault);
screens.memory.addEventListener("selectstart", preventDefault);

updateHeader();
initPage();

async function initPage() {
  await refreshAuthState();
  await loadLeaderboard();

  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") === "success") {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

function preventCopyDuringMemory(event) {
  if (screens.memory.classList.contains("active")) {
    event.preventDefault();
  }
}

function preventDefault(event) {
  event.preventDefault();
}

async function refreshAuthState() {
  state.authChecked = false;
  renderAuthBar({ loading: true });

  if (!isServerApiEnabled()) {
    state.currentUser = null;
    state.authChecked = true;
    renderAuthBar();
    updateStartButton();
    return;
  }

  try {
    const response = await fetch(`${getAuthApiBase()}/auth/me`, {
      credentials: "include"
    });
    if (response.ok) {
      const payload = await response.json();
      state.currentUser = payload.user;
    } else {
      state.currentUser = null;
    }
  } catch {
    state.currentUser = null;
  }

  state.authChecked = true;
  renderAuthBar();
  updateStartButton();
}

function renderAuthBar(options = {}) {
  if (options.loading) {
    authBar.innerHTML = `<span class="auth-status">正在检查登录状态...</span>`;
    return;
  }

  if (state.currentUser) {
    const avatar = state.currentUser.avatarUrl
      ? `<img class="auth-avatar" src="${escapeHtml(state.currentUser.avatarUrl)}" alt="" />`
      : `<span class="auth-avatar auth-avatar-fallback">${escapeHtml(state.currentUser.name.slice(0, 1))}</span>`;
    authBar.innerHTML = `
      <div class="auth-user">
        ${avatar}
        <span class="auth-name">${escapeHtml(state.currentUser.name)}</span>
      </div>
      <button type="button" class="secondary-btn auth-logout-btn" id="logoutBtn">退出</button>
    `;
    document.querySelector("#logoutBtn")?.addEventListener("click", handleLogout);
    return;
  }

  authBar.innerHTML = `
    <a class="primary-btn auth-login-btn" href="${getFeishuLoginUrl()}">飞书登录</a>
  `;
}

function updateStartButton() {
  const loggedIn = Boolean(state.currentUser);
  startBtn.disabled = state.authChecked && !loggedIn && isServerApiEnabled();
  loginHint.hidden = loggedIn || !isServerApiEnabled();
  loginHint.textContent = loggedIn
    ? ""
    : "请先使用飞书登录后再开始闯关。";
}

function handleStartClick() {
  if (!state.authChecked) {
    return;
  }

  if (isServerApiEnabled() && !state.currentUser) {
    window.location.href = getFeishuLoginUrl();
    return;
  }

  startGame();
}

async function handleLogout() {
  if (!isServerApiEnabled()) {
    return;
  }

  try {
    await fetch(`${getAuthApiBase()}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch {
    // ignore network errors and clear local auth state
  }

  state.currentUser = null;
  renderAuthBar();
  updateStartButton();
}

function startGame() {
  state.round = 1;
  state.startedAt = Date.now();
  state.completedDurationSeconds = null;
  state.usedMemoryQuestions.clear();
  state.usedLeanQuestions.clear();
  playRound();
}

function resetGame() {
  clearInterval(state.timer);
  clearInterval(state.leanTimer);
  clearInterval(state.recallTimer);
  state.round = 1;
  state.memoryQuestion = null;
  state.leanQuestion = null;
  state.startedAt = null;
  state.completedDurationSeconds = null;
  state.usedMemoryQuestions.clear();
  state.usedLeanQuestions.clear();
  leanFeedback.textContent = "";
  recallFeedback.textContent = "";
  updateHeader();
  showScreen("intro");
  loadLeaderboard();
}

function nextRound() {
  state.round += 1;
  playRound();
}

function playRound() {
  const difficulty = getDifficulty();
  state.memoryQuestion = randomUnusedItem(window.questionBank.memory[difficulty.key], state.usedMemoryQuestions);
  state.leanQuestion = randomUnusedItem(window.questionBank.lean[difficulty.key], state.usedLeanQuestions);
  leanFeedback.textContent = "";
  recallFeedback.textContent = "";
  updateHeader();
  showMemoryQuestion();
}

function showMemoryQuestion() {
  const difficulty = getDifficulty();
  const memorySeconds = MEMORY_SECONDS_BY_DIFFICULTY[difficulty.key];
  showScreen("memory");
  memoryQuestionEl.textContent = state.memoryQuestion.question;
  let remaining = memorySeconds;
  countdownText.textContent = `${remaining} 秒后进入精益问题`;

  clearInterval(state.timer);
  state.timer = setInterval(() => {
    remaining -= 1;
    countdownText.textContent = remaining > 0 ? `${remaining} 秒后进入精益问题` : "切换中...";
    if (remaining <= 0) {
      clearInterval(state.timer);
      showLeanQuestion();
    }
  }, 1000);
}

function showLeanQuestion() {
  showScreen("lean");
  leanQuestionEl.textContent = state.leanQuestion.question;
  leanTimerText.textContent = `剩余 ${LEAN_SECONDS} 秒`;
  leanForm.innerHTML = "";

  shuffle([...state.leanQuestion.options]).forEach((option) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const text = document.createElement("span");

    label.className = "option-card";
    input.type = "radio";
    input.name = "leanAnswer";
    input.value = option;
    input.required = true;
    text.textContent = option;
    label.append(input, text);
    leanForm.append(label);
  });

  const submit = document.createElement("button");
  submit.className = "primary-btn full-width";
  submit.type = "submit";
  submit.textContent = "提交精益答案";
  leanForm.append(submit);
  startLeanTimer();
}

function handleLeanAnswer(event) {
  event.preventDefault();
  clearInterval(state.leanTimer);
  const formData = new FormData(leanForm);
  const answer = formData.get("leanAnswer");
  if (answer !== state.leanQuestion.answer) {
    showFailure(`精益题答案应为“${state.leanQuestion.answer}”。`);
    return;
  }

  showCorrectModal();
  setTimeout(() => {
    hideCorrectModal();
    showRecallQuestion();
  }, 1500);
}

function showRecallQuestion() {
  showScreen("recall");
  recallPrompt.textContent = "请填写刚才热身题的答案";
  recallInput.value = "";
  recallInput.focus();
  startRecallTimerIfNeeded();
}

async function handleRecallAnswer(event) {
  event.preventDefault();
  clearInterval(state.recallTimer);
  const answer = normalizeAnswer(recallInput.value);
  const correctAnswer = normalizeAnswer(state.memoryQuestion.answer);
  if (answer !== correctAnswer) {
    showFailure(`热身题答案是 ${state.memoryQuestion.answer}。`);
    return;
  }

  updateProgress(state.round);

  if (state.round >= TOTAL_ROUNDS) {
    state.completedDurationSeconds = Math.round((Date.now() - state.startedAt) / 1000);
    await completeChallenge();
  } else {
    showSuccess("闯关成功", "本关完成，可以进入下一关。");
  }
}

async function completeChallenge() {
  const durationText = formatDuration(state.completedDurationSeconds || 0);
  showSuccess("全部通关", `太棒了，10 关全部完成。本次用时 ${durationText}。`);

  if (!isServerApiEnabled()) {
    return;
  }

  try {
    const response = await fetch(`${config.apiBase}/score-submit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "Lean Basics",
        stageName: "知识闯关：认识精益",
        completedAt: new Date().toISOString(),
        durationSeconds: state.completedDurationSeconds || 0
      })
    });

    if (!response.ok) {
      resultBody.textContent += " 成绩提交失败，请稍后重试。";
      return;
    }

    resultBody.textContent += " 成绩已记录到排行榜。";
    await loadLeaderboard();
  } catch {
    resultBody.textContent += " 成绩提交失败，请检查网络后重试。";
  }
}

function showSuccess(title, body) {
  resultKicker.textContent = "成功";
  resultTitle.textContent = title;
  resultBody.textContent = body;
  nextBtn.hidden = state.round >= TOTAL_ROUNDS;
  restartBtn.textContent = state.round >= TOTAL_ROUNDS ? "再玩一次" : "重新开始";
  showScreen("result");
}

function showFailure(reason) {
  clearInterval(state.leanTimer);
  clearInterval(state.recallTimer);
  resultKicker.textContent = "很遗憾";
  resultTitle.textContent = "闯关失败";
  resultBody.textContent = reason;
  nextBtn.hidden = true;
  restartBtn.textContent = "重新挑战";
  showScreen("result");
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function getDifficulty() {
  return difficultyConfig.find((item) => state.round <= item.maxRound);
}

function updateHeader() {
  const difficulty = getDifficulty();
  roundLabel.textContent = `第 ${state.round} / ${TOTAL_ROUNDS} 关`;
  difficultyLabel.textContent = difficulty.label;
  updateProgress(state.round - 1);
}

function updateProgress(completedRounds) {
  progressFill.style.width = `${(completedRounds / TOTAL_ROUNDS) * 100}%`;
}

function startLeanTimer() {
  let remaining = LEAN_SECONDS;
  clearInterval(state.leanTimer);
  state.leanTimer = setInterval(() => {
    remaining -= 1;
    leanTimerText.textContent = `剩余 ${remaining} 秒`;
    if (remaining <= 0) {
      clearInterval(state.leanTimer);
      showFailure("精益题答题超时。");
    }
  }, 1000);
}

function startRecallTimerIfNeeded() {
  const difficulty = getDifficulty();
  clearInterval(state.recallTimer);

  if (difficulty.key !== "high") {
    recallTimerText.textContent = "";
    recallTimerText.hidden = true;
    return;
  }

  let remaining = HIGH_RECALL_SECONDS;
  recallTimerText.hidden = false;
  recallTimerText.textContent = `剩余 ${remaining} 秒`;
  state.recallTimer = setInterval(() => {
    remaining -= 1;
    recallTimerText.textContent = remaining > 0 ? `剩余 ${remaining} 秒` : "时间到";
    if (remaining <= 0) {
      clearInterval(state.recallTimer);
      showFailure("高级关卡回忆答案超时。");
    }
  }, 1000);
}

function showCorrectModal() {
  correctModal.hidden = false;
  correctModal.classList.add("show");
}

function hideCorrectModal() {
  correctModal.classList.remove("show");
  correctModal.hidden = true;
}

async function loadLeaderboard() {
  if (!isServerApiEnabled()) {
    leaderboardList.innerHTML = `<p class="empty-state">本地预览模式，暂无排行榜数据。</p>`;
    return;
  }

  leaderboardList.innerHTML = `<p class="empty-state">正在加载排行榜...</p>`;

  try {
    const response = await fetch(`${config.apiBase}/leaderboard?limit=10`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("leaderboard load failed");
    }

    const payload = await response.json();
    renderLeaderboard(payload.entries || []);
  } catch {
    leaderboardList.innerHTML = `<p class="empty-state">排行榜加载失败，请稍后刷新。</p>`;
  }
}

function renderLeaderboard(entries) {
  if (entries.length === 0) {
    leaderboardList.innerHTML = `<p class="empty-state">暂无通关记录，快来拿下第一名！</p>`;
    return;
  }

  leaderboardList.innerHTML = `
    <ol class="leaderboard-rows">
      ${entries
        .map((entry) => {
          const isCurrentUser = state.currentUser?.id === entry.userId;
          const avatar = entry.avatarUrl
            ? `<img class="leaderboard-avatar" src="${escapeHtml(entry.avatarUrl)}" alt="" />`
            : `<span class="leaderboard-avatar leaderboard-avatar-fallback">${escapeHtml((entry.userName || "?").slice(0, 1))}</span>`;
          return `
            <li class="leaderboard-row${isCurrentUser ? " is-current-user" : ""}">
              <span class="leaderboard-rank">${entry.rank}</span>
              ${avatar}
              <div class="leaderboard-meta">
                <strong>${escapeHtml(entry.userName || "未知用户")}</strong>
                ${entry.orgName ? `<span>${escapeHtml(entry.orgName)}</span>` : ""}
              </div>
              <span class="leaderboard-duration">${formatDuration(entry.durationSeconds)}</span>
            </li>
          `;
        })
        .join("")}
    </ol>
  `;
}

function getFeishuLoginUrl() {
  return `${getAuthApiBase()}/auth/feishu/login?state=lean-challenge`;
}

function getAuthApiBase() {
  return config.authApiBase || "/api";
}

function isServerApiEnabled() {
  return Boolean(config.apiBase && window.location.protocol !== "file:");
}

function transferLocalScoresToAdmin() {
  window.name = "";
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}分${restSeconds}秒` : `${restSeconds}秒`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomUnusedItem(items, usedQuestions) {
  const availableItems = items.filter((item) => !usedQuestions.has(item.question));
  const pool = availableItems.length > 0 ? availableItems : items;
  const item = randomItem(pool);
  usedQuestions.add(item.question);
  return item;
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase();
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  }
  return items;
}
