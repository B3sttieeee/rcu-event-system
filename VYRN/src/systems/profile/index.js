// =====================================================
// PROFILE SYSTEM - VYRN FULL STABLE (SINGLE SOURCE)
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const TMP_PATH = `${PROFILE_PATH}.tmp`;

const DEBUG = process.env.DEBUG_PROFILE_VOICE === "true" || true; // włączone do testów

let db = { users: {} };
let saveQueue = Promise.resolve();

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== LOAD ======================
function load() {
  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      db = { users: {} };
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(db, null, 2));
      console.log("[PROFILE] Utworzono nowy plik profile.json");
      return db;
    }

    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { users: {} };
    db = { users: parsed.users || parsed };
    if (!db.users) db.users = {};

    console.log(`[PROFILE] Załadowano ${Object.keys(db.users).length} profili`);
    return db;
  } catch (err) {
    console.error("[PROFILE LOAD ERROR]", err.message);
    db = { users: {} };
    return db;
  }
}

// ====================== SAVE ======================
function save() {
  const snapshot = JSON.stringify(db, null, 2);

  saveQueue = saveQueue.then(async () => {
    try {
      await fs.promises.writeFile(TMP_PATH, snapshot, "utf8");
      await fs.promises.rename(TMP_PATH, PROFILE_PATH);
      if (DEBUG) console.log(`[PROFILE] ✅ Zapisano profile.json`);
    } catch (err) {
      console.error("[PROFILE SAVE ERROR]", err.message);
    }
  });

  return saveQueue;
}

// ====================== USER ======================
function ensureUser(userId) {
  if (!userId) return null;
  if (!db.users[userId]) {
    db.users[userId] = { voice: 0 };
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
    console.log(`[PROFILE][VOICE] ${userId} +${amount}s | ${before} → ${user.voice} (${Math.floor(user.voice/60)} min)`);
  }

  save(); // zapisz
  return true;
}

function getVoiceMinutes(userId) {
  const user = db.users[userId] || { voice: 0 };
  const minutes = Math.floor((user.voice || 0) / 60);

  if (DEBUG) {
    console.log(`[PROFILE] getVoiceMinutes(${userId}) = ${minutes} minut`);
  }
  return minutes;
}

// ====================== INIT ======================
function init() {
  load();
  console.log("📁 Profile System → załadowany (STABLE)");

  // Awaryjny zapis co 30 sekund
  setInterval(save, 30000);

  process.on("SIGINT", () => save());
  process.on("SIGTERM", () => save());
}

module.exports = {
  init,
  load,
  save,
  ensureUser,
  getProfile,
  addVoiceTime,
  getVoiceMinutes
};
