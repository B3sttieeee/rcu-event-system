// =====================================================
// PROFILE SYSTEM - VYRN CLEAN FIXED STABLE
// =====================================================

const fs = require("fs");
const path = require("path");

// ====================== PATHS ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const PROFILE_TMP_PATH = `${PROFILE_PATH}.tmp`;

// ====================== DEBUG ======================
const DEBUG_PROFILE_VOICE = process.env.DEBUG_PROFILE_VOICE === "true";

// ====================== CACHE ======================
let dbCache = { users: {} };
let saveLock = Promise.resolve();

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== HELPERS ======================
const toSafeNumber = (v, f = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
};

const normalizeUser = (u = {}) => ({
  voice: toSafeNumber(u.voice, 0)
});

function loadFile() {
  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      fs.writeFileSync(PROFILE_PATH, JSON.stringify({ users: {} }, null, 2));
      return { users: {} };
    }

    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    return raw.trim() ? JSON.parse(raw) : { users: {} };

  } catch (err) {
    console.error("[PROFILE LOAD ERROR]", err);
    return { users: {} };
  }
}

function saveFile(data) {
  const snapshot = JSON.stringify(data, null, 2);

  saveLock = saveLock
    .then(async () => {
      await fs.promises.writeFile(PROFILE_TMP_PATH, snapshot, "utf8");
      await fs.promises.rename(PROFILE_TMP_PATH, PROFILE_PATH);
    })
    .catch(err => {
      console.error("[PROFILE SAVE ERROR]", err);
    });

  return saveLock;
}

// ====================== CORE ======================
function ensureUser(userId) {
  if (!userId) return null;

  const db = loadFile();

  if (!db.users[userId]) {
    db.users[userId] = normalizeUser();
  } else {
    db.users[userId] = normalizeUser(db.users[userId]);
  }

  dbCache = db;
  return db.users[userId];
}

function getProfile(userId) {
  const db = loadFile();
  return db.users?.[userId] || normalizeUser();
}

// ====================== VOICE ======================
function addVoiceTime(userId, seconds) {
  const amount = Math.floor(Number(seconds));
  if (!userId || amount <= 0) return false;

  const db = loadFile();

  if (!db.users[userId]) {
    db.users[userId] = normalizeUser();
  }

  const user = db.users[userId];

  const before = user.voice;
  user.voice += amount;

  if (DEBUG_PROFILE_VOICE) {
    console.log(`[PROFILE VOICE] ${userId} +${amount}s (${before}→${user.voice})`);
  }

  saveFile(db);
  return true;
}

function getVoiceMinutes(userId) {
  const db = loadFile();
  const user = db.users?.[userId] || normalizeUser();

  return Math.floor((user.voice || 0) / 60);
}

// ====================== INIT ======================
function init() {
  loadFile();
  console.log("📁 Profile System CLEAN FIX loaded");

  process.on("SIGINT", () => saveFile(dbCache));
  process.on("SIGTERM", () => saveFile(dbCache));
}

// ====================== EXPORT ======================
module.exports = {
  init,
  ensureUser,
  getProfile,
  addVoiceTime,
  getVoiceMinutes
};
