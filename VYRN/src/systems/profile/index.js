// =====================================================
// PROFILE SYSTEM - VYRN FULL STABLE (SINGLE SOURCE)
// =====================================================

const fs = require("fs");
const path = require("path");

// ====================== PATH ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const TMP_PATH = `${PROFILE_PATH}.tmp`;

// ====================== DEBUG ======================
const DEBUG = process.env.DEBUG_PROFILE_VOICE === "true";

// ====================== MEMORY DB ======================
let db = { users: {} };
let saveQueue = Promise.resolve();

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== LOAD ======================
function load() {
  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      fs.writeFileSync(PROFILE_PATH, JSON.stringify({ users: {} }, null, 2));
      db = { users: {} };
      return db;
    }

    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { users: {} };

    db = {
      users: parsed.users || {}
    };

    return db;

  } catch (err) {
    console.error("[PROFILE LOAD ERROR]", err);
    db = { users: {} };
    return db;
  }
}

// ====================== SAVE (BATCHED) ======================
function save() {
  const snapshot = JSON.stringify(db, null, 2);

  saveQueue = saveQueue.then(async () => {
    try {
      await fs.promises.writeFile(TMP_PATH, snapshot, "utf8");
      await fs.promises.rename(TMP_PATH, PROFILE_PATH);
    } catch (err) {
      console.error("[PROFILE SAVE ERROR]", err);
    }
  });

  return saveQueue;
}

// ====================== USER ======================
function ensureUser(userId) {
  if (!userId) return null;

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0
    };
  }

  return db.users[userId];
}

function getProfile(userId) {
  return db.users[userId] || { voice: 0 };
}

// ====================== VOICE ======================
function addVoiceTime(userId, seconds) {
  const amount = Math.floor(Number(seconds));
  if (!userId || amount <= 0) return false;

  const user = ensureUser(userId);

  const before = user.voice;
  user.voice += amount;

  if (DEBUG) {
    console.log(`[PROFILE] ${userId} +${amount}s (${before} → ${user.voice})`);
  }

  save();
  return true;
}

// ====================== GET VOICE ======================
function getVoiceMinutes(userId) {
  const user = db.users[userId] || { voice: 0 };
  return Math.floor((user.voice || 0) / 60);
}

// ====================== INIT ======================
function init() {
  load();
  console.log("📁 Profile System STABLE loaded");
}

// ====================== EXPORT ======================
module.exports = {
  init,
  load,
  save,
  ensureUser,
  getProfile,
  addVoiceTime,
  getVoiceMinutes
};
