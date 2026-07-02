const TOTAL_ROUNDS = 10;
const MEMORY_SECONDS_BY_DIFFICULTY = {
  low: 4,
  medium: 3,
  high: 3
};
const LEAN_SECONDS = 10;
const HIGH_RECALL_SECONDS = 6;
const CONTACT_FORM_ENDPOINT = "";
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
  usedLeanQuestions: new Set()
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
const contactModal = document.querySelector("#contactModal");
const contactForm = document.querySelector("#contactForm");
const contactFeedback = document.querySelector("#contactFeedback");
const adminEntryLink = document.querySelector("#adminEntryLink");

document.querySelector("#startBtn").addEventListener("click", startGame);
nextBtn.addEventListener("click", nextRound);
restartBtn.addEventListener("click", resetGame);
leanForm.addEventListener("submit", handleLeanAnswer);
recallForm.addEventListener("submit", handleRecallAnswer);
contactForm.addEventListener("submit", handleContactSubmit);
adminEntryLink.addEventListener("click", transferLocalScoresToAdmin);

updateHeader();

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

function handleRecallAnswer(event) {
  event.preventDefault();
  clearInterval(state.recallTimer);
  const answer = normalizeAnswer(recallInput.value);
  const correctAnswer = normalizeAnswer(state.memoryQuestion.answer);
  if (answer !== correctAnswer) {
    showFailure(`热身题答案是 ${state.memoryQuestion.answer}。`);
    return;
  }

  if (state.round >= TOTAL_ROUNDS) {
    state.completedDurationSeconds = Math.round((Date.now() - state.startedAt) / 1000);
    showSuccess("全部通关", "太棒了，10 关全部完成。");
    setTimeout(showContactModal, 500);
  } else {
    showSuccess("闯关成功", "本关完成，可以进入下一关。");
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
  progressFill.style.width = `${((state.round - 1) / TOTAL_ROUNDS) * 100}%`;
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

function showContactModal() {
  contactModal.hidden = false;
  contactModal.classList.add("show");
  contactFeedback.textContent = "";
  contactForm.elements.name.focus();
}

async function handleContactSubmit(event) {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const contact = {
    stage: "Lean Basics",
    stageName: "知识闯关：认识精益",
    score: TOTAL_ROUNDS,
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    organization: String(formData.get("organization") || "").trim(),
    completedAt: new Date().toISOString(),
    durationSeconds: state.completedDurationSeconds || 0
  };
  contactFeedback.textContent = "正在提交...";

  try {
    if (isServerApiEnabled()) {
      await saveContactViaServerApi(contact);
      saveContactLocally(contact);
    } else if (isRemoteScoresEnabled()) {
      await saveContactRemotely(contact);
      saveContactLocally(contact);
    } else if (CONTACT_FORM_ENDPOINT) {
      await fetch(CONTACT_FORM_ENDPOINT, {
        method: "POST",
        body: formData
      });
    } else if (window.location.protocol !== "file:") {
      formData.append("completedAt", contact.completedAt);
      formData.append("durationSeconds", String(contact.durationSeconds));
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString()
      });
    } else {
      saveContactLocally(contact);
    }

    contactFeedback.textContent = "提交成功，感谢参与！";
    contactForm.reset();
    setTimeout(() => {
      contactModal.classList.remove("show");
      contactModal.hidden = true;
    }, 1200);
  } catch (error) {
    contactFeedback.textContent = "提交失败，请稍后再试。";
  }
}

function saveContactLocally(contact) {
  const contacts = JSON.parse(localStorage.getItem("leanGameContacts") || "[]");
  contacts.push(contact);
  localStorage.setItem("leanGameContacts", JSON.stringify(contacts));
}

async function saveContactViaServerApi(contact) {
  const response = await fetch(`${config.apiBase}/score-submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact)
  });

  if (!response.ok) {
    throw new Error("Server score save failed");
  }
}

async function saveContactRemotely(contact) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.scoresTable || "lean_game_scores"}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      stage: contact.stage,
      stage_name: contact.stageName,
      score: contact.score,
      name: contact.name,
      phone: contact.phone,
      organization: contact.organization,
      completed_at: contact.completedAt,
      duration_seconds: contact.durationSeconds
    })
  });

  if (!response.ok) {
    throw new Error("Remote score save failed");
  }
}

function isRemoteScoresEnabled() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

function isServerApiEnabled() {
  return Boolean(config.apiBase && window.location.protocol !== "file:");
}

function transferLocalScoresToAdmin() {
  const contacts = localStorage.getItem("leanGameContacts");
  if (!contacts) {
    window.name = "";
    return;
  }

  window.name = JSON.stringify({
    type: "leanGameScoresTransfer",
    contacts: JSON.parse(contacts)
  });
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
