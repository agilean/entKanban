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
  authChecked: false,
  leaderboardEntries: [],
  shareImageBlob: null,
  shareImageUrl: null
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
const failureAnalysis = document.querySelector("#failureAnalysis");
const analysisTitle = document.querySelector("#analysisTitle");
const analysisUserAnswer = document.querySelector("#analysisUserAnswer");
const analysisCorrectAnswer = document.querySelector("#analysisCorrectAnswer");
const analysisExplanation = document.querySelector("#analysisExplanation");
const sharePanel = document.querySelector("#sharePanel");
const sharePreview = document.querySelector("#sharePreview");
const shareStatus = document.querySelector("#shareStatus");
const shareFeishuBtn = document.querySelector("#shareFeishuBtn");
const saveShareBtn = document.querySelector("#saveShareBtn");
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
shareFeishuBtn.addEventListener("click", shareChallengeImage);
saveShareBtn.addEventListener("click", downloadShareImage);
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
  clearResultExtras();
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
  clearResultExtras();
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
    showFailure("这道精益题答错了。", {
      question: state.leanQuestion.question,
      userAnswer: answer || "未作答",
      correctAnswer: state.leanQuestion.answer,
      explanation: state.leanQuestion.explanation
    });
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
    await prepareShareCard({
      personalBestDurationSeconds: state.completedDurationSeconds || 0,
      currentRank: null
    });
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
      await prepareShareCard({
        personalBestDurationSeconds: state.completedDurationSeconds || 0,
        currentRank: null
      });
      return;
    }

    const payload = await response.json();
    const bestDuration = Number(payload.personalBestDurationSeconds)
      || state.completedDurationSeconds
      || 0;
    resultBody.textContent += payload.isPersonalBest
      ? " 恭喜刷新个人最好成绩，已记录到排行榜。"
      : ` 成绩已记录；你的最好成绩仍是 ${formatDuration(bestDuration)}。`;
    await loadLeaderboard();
    await prepareShareCard({
      personalBestDurationSeconds: bestDuration,
      currentRank: Number(payload.currentRank) || null
    });
  } catch {
    resultBody.textContent += " 成绩提交失败，请检查网络后重试。";
    await prepareShareCard({
      personalBestDurationSeconds: state.completedDurationSeconds || 0,
      currentRank: null
    });
  }
}

function showSuccess(title, body) {
  hideFailureAnalysis();
  sharePanel.hidden = true;
  resultKicker.textContent = "成功";
  resultTitle.textContent = title;
  resultBody.textContent = body;
  nextBtn.hidden = state.round >= TOTAL_ROUNDS;
  restartBtn.textContent = state.round >= TOTAL_ROUNDS ? "再玩一次" : "重新开始";
  showScreen("result");
}

function showFailure(reason, analysis = null) {
  clearInterval(state.leanTimer);
  clearInterval(state.recallTimer);
  sharePanel.hidden = true;
  renderFailureAnalysis(analysis);
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
      showFailure("精益题答题超时。", {
        question: state.leanQuestion.question,
        userAnswer: "未作答",
        correctAnswer: state.leanQuestion.answer,
        explanation: state.leanQuestion.explanation
      });
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
    state.leaderboardEntries = [];
    leaderboardList.innerHTML = `<p class="empty-state">本地预览模式，暂无排行榜数据。</p>`;
    return state.leaderboardEntries;
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
    state.leaderboardEntries = payload.entries || [];
    renderLeaderboard(state.leaderboardEntries);
  } catch {
    state.leaderboardEntries = [];
    leaderboardList.innerHTML = `<p class="empty-state">排行榜加载失败，请稍后刷新。</p>`;
  }

  return state.leaderboardEntries;
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

function renderFailureAnalysis(analysis) {
  if (!analysis) {
    hideFailureAnalysis();
    return;
  }

  analysisTitle.textContent = analysis.question;
  analysisUserAnswer.textContent = analysis.userAnswer;
  analysisCorrectAnswer.textContent = analysis.correctAnswer;
  analysisExplanation.textContent = analysis.explanation || "请结合正确答案重新理解这个知识点。";
  failureAnalysis.hidden = false;
}

function hideFailureAnalysis() {
  failureAnalysis.hidden = true;
  analysisTitle.textContent = "";
  analysisUserAnswer.textContent = "";
  analysisCorrectAnswer.textContent = "";
  analysisExplanation.textContent = "";
}

function clearResultExtras() {
  hideFailureAnalysis();
  sharePanel.hidden = true;
  shareStatus.textContent = "";
  sharePreview.removeAttribute("src");
  state.shareImageBlob = null;
  if (state.shareImageUrl) {
    URL.revokeObjectURL(state.shareImageUrl);
    state.shareImageUrl = null;
  }
}

async function prepareShareCard(summary) {
  sharePanel.hidden = false;
  shareStatus.textContent = "正在生成排行榜图片...";
  shareFeishuBtn.disabled = true;
  saveShareBtn.disabled = true;

  try {
    const blob = await createChallengeShareImage(summary);
    if (state.shareImageUrl) {
      URL.revokeObjectURL(state.shareImageUrl);
    }
    state.shareImageBlob = blob;
    state.shareImageUrl = URL.createObjectURL(blob);
    sharePreview.src = state.shareImageUrl;
    shareStatus.textContent = "图片已生成，可直接分享或保存。";
    shareFeishuBtn.disabled = false;
    saveShareBtn.disabled = false;
  } catch {
    shareStatus.textContent = "图片生成失败，请刷新页面后重试。";
  }
}

async function createChallengeShareImage(summary) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1620;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable");
  }

  const userName = state.currentUser?.name || "精益挑战者";
  const entries = state.leaderboardEntries.slice(0, 10);
  const currentEntry = entries.find((entry) => entry.userId === state.currentUser?.id);
  const currentRank = summary.currentRank || currentEntry?.rank || null;
  const bestDuration = summary.personalBestDurationSeconds || state.completedDurationSeconds || 0;

  context.fillStyle = "#f3f7f7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f5963";
  context.fillRect(0, 0, canvas.width, 330);
  context.fillStyle = "#e67e22";
  context.fillRect(0, 0, 18, 330);

  setCanvasFont(context, 30, 700);
  context.fillStyle = "#bfe1dc";
  context.fillText("精益游戏屋 · 精益闯关", 72, 78);
  setCanvasFont(context, 72, 800);
  context.fillStyle = "#ffffff";
  context.fillText("我通关啦！", 72, 178);
  setCanvasFont(context, 28, 500);
  context.fillStyle = "#d9efec";
  context.fillText("10 关全部完成，来和我比一比精益实力", 72, 236);

  drawRoundedRect(context, 58, 272, 964, 276, 18, "#ffffff", "#d9e5e4");
  setCanvasFont(context, 24, 700);
  context.fillStyle = "#69777a";
  context.fillText("挑战者", 96, 326);
  setCanvasFont(context, 42, 800);
  context.fillStyle = "#142023";
  drawFittedCanvasText(context, userName, 96, 382, 520);

  drawRoundedRect(context, 96, 420, 348, 88, 12, "#edf7f5");
  setCanvasFont(context, 20, 700);
  context.fillStyle = "#4b5c60";
  context.fillText("个人最好", 122, 454);
  setCanvasFont(context, 34, 800);
  context.fillStyle = "#0f5963";
  context.fillText(formatImageDuration(bestDuration), 122, 493);

  drawRoundedRect(context, 464, 420, 278, 88, 12, "#fff4e8");
  setCanvasFont(context, 20, 700);
  context.fillStyle = "#7f4b18";
  context.fillText("当前排名", 490, 454);
  setCanvasFont(context, 34, 800);
  context.fillStyle = "#b05612";
  context.fillText(currentRank ? `第 ${currentRank} 名` : "待上榜", 490, 493);

  drawRoundedRect(context, 762, 420, 220, 88, 12, "#f6f8f8");
  setCanvasFont(context, 20, 700);
  context.fillStyle = "#69777a";
  context.fillText("完成关卡", 788, 454);
  setCanvasFont(context, 34, 800);
  context.fillStyle = "#142023";
  context.fillText("10 / 10", 788, 493);

  setCanvasFont(context, 34, 800);
  context.fillStyle = "#142023";
  context.fillText("通关前十排行榜", 64, 620);
  setCanvasFont(context, 22, 500);
  context.fillStyle = "#69777a";
  context.fillText("每人按最好成绩排名 · 用时越短越靠前", 64, 660);

  let rowY = 690;
  if (entries.length === 0) {
    drawRoundedRect(context, 64, rowY, 952, 92, 12, "#ffffff", "#d9e5e4");
    setCanvasFont(context, 25, 600);
    context.fillStyle = "#69777a";
    context.fillText("排行榜数据暂未加载", 96, rowY + 57);
    rowY += 112;
  } else {
    entries.forEach((entry) => {
      drawShareLeaderboardRow(context, entry, rowY, entry.userId === state.currentUser?.id);
      rowY += 72;
    });
  }

  if (currentRank && currentRank > 10) {
    setCanvasFont(context, 20, 700);
    context.fillStyle = "#b05612";
    context.fillText("我的排名", 64, rowY + 20);
    rowY += 34;
    drawShareLeaderboardRow(context, {
      rank: currentRank,
      userName,
      orgName: state.currentUser?.orgName || "",
      durationSeconds: bestDuration
    }, rowY, true);
  }

  context.fillStyle = "#0f5963";
  context.fillRect(0, 1532, 1080, 88);
  setCanvasFont(context, 24, 700);
  context.fillStyle = "#ffffff";
  context.fillText("打开精益闯关，刷新你的最好成绩", 64, 1584);
  setCanvasFont(context, 20, 500);
  context.fillStyle = "#bfe1dc";
  context.textAlign = "right";
  context.fillText(formatShareDate(new Date()), 1016, 1584);
  context.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Image encoding failed"));
      }
    }, "image/png");
  });
}

function drawShareLeaderboardRow(context, entry, y, isCurrentUser) {
  const background = isCurrentUser ? "#fff4e8" : "#ffffff";
  const border = isCurrentUser ? "#e67e22" : "#d9e5e4";
  drawRoundedRect(context, 64, y, 952, 62, 10, background, border);

  drawRoundedRect(context, 84, y + 11, 48, 40, 8, isCurrentUser ? "#e67e22" : "#e8f0ef");
  setCanvasFont(context, 21, 800);
  context.fillStyle = isCurrentUser ? "#ffffff" : "#0f5963";
  context.textAlign = "center";
  context.fillText(String(entry.rank), 108, y + 39);
  context.textAlign = "left";

  setCanvasFont(context, 23, 800);
  context.fillStyle = "#142023";
  drawFittedCanvasText(context, entry.userName || "未知用户", 158, y + 38, 470);
  if (isCurrentUser) {
    setCanvasFont(context, 17, 700);
    context.fillStyle = "#b05612";
    context.fillText("这是我", 650, y + 38);
  }

  setCanvasFont(context, 24, 800);
  context.fillStyle = "#0f5963";
  context.textAlign = "right";
  context.fillText(formatImageDuration(entry.durationSeconds), 988, y + 39);
  context.textAlign = "left";
}

function drawRoundedRect(context, x, y, width, height, radius, fill, stroke = null) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.stroke();
  }
}

function setCanvasFont(context, size, weight) {
  context.font = `${weight} ${size}px "Microsoft YaHei", "PingFang SC", Arial, sans-serif`;
}

function drawFittedCanvasText(context, value, x, y, maxWidth) {
  const text = String(value);
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let fitted = text;
  while (fitted.length > 1 && context.measureText(`${fitted}…`).width > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  context.fillText(`${fitted}…`, x, y);
}

async function shareChallengeImage() {
  if (!state.shareImageBlob) {
    return;
  }

  const file = new File([state.shareImageBlob], getShareImageFileName(), {
    type: "image/png"
  });
  const shareData = {
    title: "我的精益闯关成绩",
    text: "我完成了精益闯关，来挑战我的最好成绩！",
    files: [file]
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      shareStatus.textContent = "分享面板已打开，请选择飞书发送。";
      return;
    }
    downloadShareImage();
    shareStatus.textContent = "当前浏览器不支持直接分享，图片已保存，请在飞书中发送。";
  } catch (error) {
    if (error?.name === "AbortError") {
      shareStatus.textContent = "已取消分享，图片仍可保存。";
      return;
    }
    downloadShareImage();
    shareStatus.textContent = "未能打开分享面板，图片已保存，请在飞书中发送。";
  }
}

function downloadShareImage() {
  if (!state.shareImageBlob) {
    return;
  }

  const link = document.createElement("a");
  const downloadUrl = URL.createObjectURL(state.shareImageBlob);
  link.href = downloadUrl;
  link.download = getShareImageFileName();
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
  shareStatus.textContent = "图片已保存，可以发送到飞书群或会话。";
}

function getShareImageFileName() {
  const userName = state.currentUser?.name || "挑战者";
  const safeName = userName.replace(/[\\/:*?"<>|]/g, "-");
  return `精益闯关-${safeName}.png`;
}

function formatImageDuration(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
}

function formatShareDate(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join(".");
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
