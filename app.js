import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  GithubAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_CduKCp2H72IwkJs-EJcQ-sHeKOV5zOk",
  authDomain: "baby-diary-29cf4.firebaseapp.com",
  projectId: "baby-diary-29cf4",
  storageBucket: "baby-diary-29cf4.firebasestorage.app",
  messagingSenderId: "782567796172",
  appId: "1:782567796172:web:3c8278a9347483ffd08169",
};

const BIRTH_DATE = new Date(2026, 4, 11);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GithubAuthProvider();

const authGate = document.querySelector("#authGate");
const appShell = document.querySelector("#appShell");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const authStatus = document.querySelector("#authStatus");
const calendarGrid = document.querySelector("#calendarGrid");
const monthLabel = document.querySelector("#monthLabel");
const calendarViewButton = document.querySelector("#calendarViewButton");
const diaryListButton = document.querySelector("#diaryListButton");
const memoMenuButton = document.querySelector("#memoMenuButton");
const detailPanel = document.querySelector("#detailPanel");
const diaryListPanel = document.querySelector("#diaryListPanel");
const memoPanel = document.querySelector("#memoPanel");
const diaryBoardList = document.querySelector("#diaryBoardList");
const selectedWeekday = document.querySelector("#selectedWeekday");
const selectedDateTitle = document.querySelector("#selectedDateTitle");
const monthCount = document.querySelector("#monthCount");
const totalCount = document.querySelector("#totalCount");
const dayCount = document.querySelector("#dayCount");
const monthAge = document.querySelector("#monthAge");
const saveStatus = document.querySelector("#saveStatus");
const entryForm = document.querySelector("#entryForm");
const detailView = document.querySelector("#detailView");
const emptyDetail = document.querySelector("#emptyDetail");
const writeButton = document.querySelector("#writeButton");
const editButton = document.querySelector("#editButton");
const deleteButton = document.querySelector("#deleteButton");
const memoPanelTitle = document.querySelector("#memoPanelTitle");
const memoBoardList = document.querySelector("#memoBoardList");
const memoDetailView = document.querySelector("#memoDetailView");
const memoMetaLine = document.querySelector("#memoMetaLine");
const memoViewBody = document.querySelector("#memoViewBody");
const memoForm = document.querySelector("#memoForm");
const newMemoButton = document.querySelector("#newMemoButton");
const editMemoButton = document.querySelector("#editMemoButton");
const deleteMemoButton = document.querySelector("#deleteMemoButton");
const memoListButton = document.querySelector("#memoListButton");
const cancelMemoButton = document.querySelector("#cancelMemoButton");
const memoStatus = document.querySelector("#memoStatus");

const viewFields = {
  weight: document.querySelector("#viewWeight"),
  height: document.querySelector("#viewHeight"),
  feeding: document.querySelector("#viewFeeding"),
  sleep: document.querySelector("#viewSleep"),
  body: document.querySelector("#viewBody"),
};

const fields = {
  weight: document.querySelector("#weightInput"),
  height: document.querySelector("#heightInput"),
  feeding: document.querySelector("#feedingInput"),
  sleep: document.querySelector("#sleepInput"),
  body: document.querySelector("#bodyInput"),
};

const memoFields = {
  title: document.querySelector("#memoTitleInput"),
  body: document.querySelector("#memoBodyInput"),
};

const weekdayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
let entries = {};
let memos = {};
let selectedDate = stripTime(new Date());
let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let activeView = "calendar";
let mode = "empty";
let memoMode = "list";
let selectedMemoId = "";
let currentUser = null;
let loginInProgress = false;
let authErrorMessage = "";
let memoLoadError = "";

loginButton.addEventListener("click", loginWithGithub);
logoutButton.addEventListener("click", () => signOut(auth));
document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
document.querySelector("#todayButton").addEventListener("click", goToday);
calendarViewButton.addEventListener("click", () => switchView("calendar"));
diaryListButton.addEventListener("click", () => switchView("diaryList"));
memoMenuButton.addEventListener("click", () => switchView("memo"));
writeButton.addEventListener("click", startWriting);
document.querySelector("#cancelButton").addEventListener("click", cancelWriting);
entryForm.addEventListener("submit", saveEntry);
editButton.addEventListener("click", startWriting);
deleteButton.addEventListener("click", deleteEntry);
newMemoButton.addEventListener("click", startNewMemo);
editMemoButton.addEventListener("click", startEditingMemo);
deleteMemoButton.addEventListener("click", deleteMemo);
memoListButton.addEventListener("click", showMemoList);
cancelMemoButton.addEventListener("click", cancelMemoWriting);
memoForm.addEventListener("submit", saveMemo);
fields.weight.addEventListener("blur", () => {
  fields.weight.value = formatWeight(fields.weight.value);
});

renderAge();
setAppVisible(false);
watchAuthState();

function watchAuthState() {
  onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    entries = {};
    memos = {};
    mode = "empty";
    memoMode = "list";
    selectedMemoId = "";
    memoLoadError = "";
    authStatus.textContent = authErrorMessage || "GitHub 로그인이 필요합니다.";
    setAppVisible(false);
    return;
  }

  authErrorMessage = "";
  authStatus.textContent = "일기를 불러오는 중입니다.";
  setAppVisible(true);
  await loadEntriesFromFirestore();
  await loadMemosFromFirestore();
  mode = entries[toKey(selectedDate)] ? "view" : "empty";
  render();
  });
}

async function loginWithGithub() {
  if (loginInProgress) return;
  loginInProgress = true;
  loginButton.disabled = true;
  authErrorMessage = "";
  authStatus.textContent = "GitHub 로그인 페이지로 이동합니다.";
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    authErrorMessage = `로그인에 실패했어요: ${error.message}`;
    authStatus.textContent = authErrorMessage;
    loginInProgress = false;
    loginButton.disabled = false;
  }
}

function setAppVisible(isVisible) {
  authGate.classList.toggle("is-hidden", isVisible);
  appShell.classList.toggle("is-hidden", !isVisible);
  loginInProgress = false;
  loginButton.disabled = false;
}

async function loadEntriesFromFirestore() {
  const snapshot = await getDocs(collection(db, "diaries"));
  entries = {};
  snapshot.forEach((diary) => {
    entries[diary.id] = normalizeEntry(diary.data());
  });
}

async function loadMemosFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, "memos"));
    memos = {};
    snapshot.forEach((memo) => {
      memos[memo.id] = normalizeMemo(memo.data());
    });
    memoLoadError = "";
  } catch (error) {
    console.error(error);
    memos = {};
    memoLoadError = "메모를 불러오지 못했어요. Firestore 권한을 확인해 주세요.";
  }
}

function render() {
  renderShell();
  renderCalendar();
  renderDetail();
  renderDiaryList();
  renderMemo();
  renderStats();
  renderAge();
}

function renderShell() {
  detailPanel.classList.toggle("is-hidden", activeView !== "calendar");
  diaryListPanel.classList.toggle("is-hidden", activeView !== "diaryList");
  memoPanel.classList.toggle("is-hidden", activeView !== "memo");
  calendarViewButton.classList.toggle("is-active", activeView === "calendar");
  diaryListButton.classList.toggle("is-active", activeView === "diaryList");
  memoMenuButton.classList.toggle("is-active", activeView === "memo");
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  monthLabel.textContent = `${visibleMonth.getFullYear()}년 ${visibleMonth.getMonth() + 1}월`;

  const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const key = toKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-button";
    button.textContent = date.getDate();
    button.setAttribute("aria-label", `${formatLongDate(date)} ${entries[key] ? "기록 있음" : "기록 없음"}`);

    if (date.getMonth() !== visibleMonth.getMonth()) button.classList.add("muted");
    if (key === toKey(new Date())) button.classList.add("today");
    if (key === toKey(selectedDate)) button.classList.add("selected");
    if (entries[key]) button.classList.add("has-entry");

    button.addEventListener("click", () => selectDate(date, entries[key] ? "view" : "empty"));
    calendarGrid.appendChild(button);
  }
}

function renderDetail() {
  const key = toKey(selectedDate);
  const entry = entries[key];
  selectedWeekday.textContent = `${weekdayNames[selectedDate.getDay()]} · ${getAgeLabel(selectedDate)}`;
  selectedDateTitle.textContent = formatLongDate(selectedDate);

  entryForm.classList.toggle("is-hidden", mode !== "write");
  detailView.classList.toggle("is-hidden", mode !== "view" || !entry);
  emptyDetail.classList.toggle("is-hidden", mode !== "empty" && (mode !== "view" || entry));
  writeButton.classList.toggle("is-hidden", !!entry || mode === "write");
  editButton.classList.toggle("is-hidden", !entry || mode === "write");
  deleteButton.classList.toggle("is-hidden", !entry || mode === "write");

  if (mode === "write") {
    fillForm(entry || {});
    saveStatus.textContent = "";
    return;
  }

  if (!entry) {
    clearView();
    saveStatus.textContent = "";
    return;
  }

  viewFields.weight.textContent = formatWeight(entry.weight) || "-";
  viewFields.height.textContent = entry.height || "-";
  viewFields.feeding.textContent = entry.feeding || "-";
  viewFields.sleep.textContent = entry.sleep || "-";
  viewFields.body.innerHTML = entry.body
    ? renderMarkdown(entry.body)
    : "오늘의 이야기가 아직 비어 있어요.";
  saveStatus.textContent = entry.updatedAt
    ? `마지막 저장: ${new Date(entry.updatedAt).toLocaleString("ko-KR")}`
    : "";
}

function renderStats() {
  const prefix = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const keys = Object.keys(entries);
  monthCount.textContent = keys.filter((key) => key.startsWith(prefix)).length;
  totalCount.textContent = keys.length;
}

function renderDiaryList() {
  const diaryItems = getSortedDiaryItems();
  diaryBoardList.replaceChildren();

  if (diaryItems.length === 0) {
    diaryBoardList.appendChild(createEmptyBoard("아직 저장된 육아일기가 없어요."));
    return;
  }

  diaryItems.forEach(([key]) => {
    const row = document.createElement("button");
    const date = parseKey(key);
    row.type = "button";
    row.className = "board-row diary-board-row";
    row.innerHTML = `
      <span class="board-date">${formatLongDate(date)}</span>
      <span class="board-meta">${getAgeLabel(date)}</span>
    `;
    row.addEventListener("click", () => {
      selectDate(date, "view");
      switchView("calendar");
    });
    diaryBoardList.appendChild(row);
  });
}

function renderMemo() {
  const memoItems = getSortedMemoItems();
  const selectedMemo = selectedMemoId ? memos[selectedMemoId] : null;

  memoBoardList.classList.toggle("is-hidden", memoMode !== "list");
  memoDetailView.classList.toggle("is-hidden", memoMode !== "view" || !selectedMemo);
  memoForm.classList.toggle("is-hidden", memoMode !== "write");
  newMemoButton.classList.toggle("is-hidden", memoMode === "write");
  editMemoButton.classList.toggle("is-hidden", memoMode !== "view" || !selectedMemo);
  deleteMemoButton.classList.toggle("is-hidden", memoMode !== "view" || !selectedMemo);
  memoListButton.classList.toggle("is-hidden", memoMode === "list");

  if (memoMode === "list") {
    memoPanelTitle.textContent = "메모";
    memoStatus.textContent = memoLoadError;
    memoBoardList.replaceChildren();

    if (memoItems.length === 0) {
      memoBoardList.appendChild(createEmptyBoard("아직 등록된 메모가 없어요."));
      return;
    }

    memoItems.forEach(([id, memo]) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "board-row";
      row.innerHTML = `
        <span class="board-date">${formatShortDate(memo.createdAt || memo.updatedAt)}</span>
        <span class="board-title">${escapeHtml(memo.title || "제목 없음")}</span>
        <span class="board-summary">${escapeHtml(getPlainText(memo.body) || "내용 없음")}</span>
        <span class="board-meta">${formatShortDateTime(memo.updatedAt)}</span>
      `;
      row.addEventListener("click", () => selectMemo(id));
      memoBoardList.appendChild(row);
    });
    return;
  }

  if (memoMode === "write") {
    memoPanelTitle.textContent = selectedMemo ? "메모 수정" : "메모 쓰기";
    memoStatus.textContent = "";
    return;
  }

  if (!selectedMemo) {
    memoMode = "list";
    renderMemo();
    return;
  }

  memoPanelTitle.textContent = selectedMemo.title || "제목 없음";
  memoMetaLine.textContent = selectedMemo.updatedAt
    ? `마지막 저장: ${new Date(selectedMemo.updatedAt).toLocaleString("ko-KR")}`
    : "";
  memoViewBody.innerHTML = selectedMemo.body ? renderMarkdown(selectedMemo.body) : "내용이 비어 있어요.";
  memoStatus.textContent = "";
}

function renderAge() {
  dayCount.textContent = getDayLabel(new Date());
  monthAge.textContent = `${getWeekLabel(new Date())} · ${getMonthLabel(new Date())}`;
}

function selectDate(date, nextMode) {
  selectedDate = stripTime(date);
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  mode = nextMode;
  render();
}

function startWriting() {
  if (!currentUser) return;
  mode = "write";
  renderDetail();
}

function cancelWriting() {
  mode = entries[toKey(selectedDate)] ? "view" : "empty";
  renderDetail();
}

async function saveEntry(event) {
  event.preventDefault();
  if (!currentUser) return;

  const key = toKey(selectedDate);
  const entry = {
    weight: formatWeight(fields.weight.value),
    height: fields.height.value.trim(),
    feeding: fields.feeding.value.trim(),
    sleep: fields.sleep.value.trim(),
    body: fields.body.value.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser.uid,
  };

  const hasContent = Object.entries(entry).some(
    ([name, value]) => !["updatedAt", "updatedBy"].includes(name) && value,
  );
  if (!hasContent) {
    saveStatus.textContent = "내용을 입력한 뒤 저장할 수 있어요.";
    return;
  }

  saveStatus.textContent = "저장하는 중입니다.";
  await setDoc(doc(db, "diaries", key), entry);
  entries[key] = entry;
  mode = "view";
  render();
}

async function deleteEntry() {
  if (!currentUser) return;

  const key = toKey(selectedDate);
  if (!entries[key]) return;

  const ok = window.confirm(`${formatLongDate(selectedDate)} 기록을 삭제할까요?`);
  if (!ok) return;

  await deleteDoc(doc(db, "diaries", key));
  delete entries[key];
  mode = "empty";
  render();
}

function changeMonth(offset) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
  renderCalendar();
  renderStats();
}

function goToday() {
  selectedDate = stripTime(new Date());
  visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  mode = entries[toKey(selectedDate)] ? "view" : "empty";
  render();
}

function switchView(view) {
  activeView = view;
  render();
}

function fillForm(entry) {
  fields.weight.value = formatWeight(entry.weight) || "";
  fields.height.value = entry.height || "";
  fields.feeding.value = entry.feeding || "";
  fields.sleep.value = entry.sleep || "";
  fields.body.value = entry.body || "";
}

function clearView() {
  Object.values(viewFields).forEach((field) => {
    field.replaceChildren();
  });
}

function normalizeEntry(entry) {
  return {
    weight: formatWeight(entry.weight),
    height: entry.height || "",
    feeding: entry.feeding || "",
    sleep: entry.sleep || "",
    body: entry.body || "",
    updatedAt: entry.updatedAt || "",
    updatedBy: entry.updatedBy || "",
  };
}

function normalizeMemo(memo) {
  return {
    title: memo.title || "",
    body: memo.body || "",
    createdAt: memo.createdAt || memo.updatedAt || "",
    updatedAt: memo.updatedAt || "",
    updatedBy: memo.updatedBy || "",
  };
}

function startNewMemo() {
  if (!currentUser) return;
  memoLoadError = "";
  selectedMemoId = "";
  memoMode = "write";
  fillMemoForm({});
  renderMemo();
}

function startEditingMemo() {
  if (!currentUser || !selectedMemoId || !memos[selectedMemoId]) return;
  memoLoadError = "";
  memoMode = "write";
  fillMemoForm(memos[selectedMemoId]);
  renderMemo();
}

function cancelMemoWriting() {
  memoMode = selectedMemoId && memos[selectedMemoId] ? "view" : "list";
  renderMemo();
}

function showMemoList() {
  memoMode = "list";
  selectedMemoId = "";
  renderMemo();
}

function selectMemo(id) {
  selectedMemoId = id;
  memoMode = "view";
  renderMemo();
}

async function saveMemo(event) {
  event.preventDefault();
  if (!currentUser) return;

  const now = new Date().toISOString();
  const existingMemo = selectedMemoId ? memos[selectedMemoId] : null;
  const memo = {
    title: memoFields.title.value.trim(),
    body: memoFields.body.value.trim(),
    createdAt: existingMemo?.createdAt || now,
    updatedAt: now,
    updatedBy: currentUser.uid,
  };

  if (!memo.title && !memo.body) {
    memoStatus.textContent = "제목이나 내용을 입력한 뒤 저장할 수 있어요.";
    return;
  }

  const id = selectedMemoId || createMemoId();
  memoStatus.textContent = "저장하는 중입니다.";
  try {
    await setDoc(doc(db, "memos", id), memo);
    memoLoadError = "";
    memos[id] = memo;
    selectedMemoId = id;
    memoMode = "view";
    renderMemo();
  } catch (error) {
    console.error(error);
    memoStatus.textContent = "메모를 저장하지 못했어요. Firestore 권한을 확인해 주세요.";
  }
}

async function deleteMemo() {
  if (!currentUser || !selectedMemoId || !memos[selectedMemoId]) return;

  const ok = window.confirm("이 메모를 삭제할까요?");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "memos", selectedMemoId));
    memoLoadError = "";
    delete memos[selectedMemoId];
    selectedMemoId = "";
    memoMode = "list";
    renderMemo();
  } catch (error) {
    console.error(error);
    memoStatus.textContent = "메모를 삭제하지 못했어요. Firestore 권한을 확인해 주세요.";
  }
}

function fillMemoForm(memo) {
  memoFields.title.value = memo.title || "";
  memoFields.body.value = memo.body || "";
}

function getSortedDiaryItems() {
  return Object.entries(entries).sort(([left], [right]) => right.localeCompare(left));
}

function getSortedMemoItems() {
  return Object.entries(memos).sort(([, left], [, right]) => {
    const leftTime = left.updatedAt || left.createdAt || "";
    const rightTime = right.updatedAt || right.createdAt || "";
    return rightTime.localeCompare(leftTime);
  });
}

function getDiaryTitle(entry) {
  const text = getPlainText(entry.body);
  return text ? text.slice(0, 34) : "기록";
}

function getDiarySummary(entry) {
  const parts = [entry.weight, entry.height, entry.feeding, entry.sleep, getPlainText(entry.body)]
    .filter(Boolean)
    .join(" · ");
  return parts.slice(0, 90) || "내용 없음";
}

function getPlainText(value) {
  return String(value || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[-*]\s+/g, "")
    .replace(/[`*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createEmptyBoard(message) {
  const empty = document.createElement("div");
  empty.className = "detail-empty board-empty";
  empty.innerHTML = `<p>${escapeHtml(message)}</p>`;
  return empty;
}

function createMemoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatWeight(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const numeric = raw
    .replace(/,/g, ".")
    .replace(/\s*kg$/i, "")
    .trim();

  if (!/^\d+(\.\d+)?$/.test(numeric)) return raw;
  return `${numeric}kg`;
}

function renderMarkdown(markdown) {
  const lines = escapeHtml(markdown).split("\n");
  const blocks = [];
  let listItems = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
      return;
    }

    flushList();

    if (!trimmed) {
      blocks.push("");
    } else if (trimmed.startsWith("### ")) {
      blocks.push(`<h4>${renderInlineMarkdown(trimmed.slice(4))}</h4>`);
    } else if (trimmed.startsWith("## ")) {
      blocks.push(`<h3>${renderInlineMarkdown(trimmed.slice(3))}</h3>`);
    } else if (trimmed.startsWith("# ")) {
      blocks.push(`<h2>${renderInlineMarkdown(trimmed.slice(2))}</h2>`);
    } else {
      blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    }
  });

  flushList();
  return blocks.filter(Boolean).join("");

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  }
}

function renderInlineMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayLabel(date) {
  const diff = daysBetween(BIRTH_DATE, stripTime(date)) + 1;
  return `D+${Math.max(diff, 1)}`;
}

function getMonthLabel(date) {
  const months = fullMonthsBetween(BIRTH_DATE, stripTime(date));
  return `${Math.max(months, 0)}개월`;
}

function getWeekLabel(date) {
  const dayNumber = daysBetween(BIRTH_DATE, stripTime(date)) + 1;
  return `${Math.max(Math.ceil(dayNumber / 7), 1)}주차`;
}

function getAgeLabel(date) {
  return `${getDayLabel(date)} · ${getWeekLabel(date)} · ${getMonthLabel(date)}`;
}

function daysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((stripTime(end) - stripTime(start)) / msPerDay);
}

function fullMonthsBetween(start, end) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  return months;
}
