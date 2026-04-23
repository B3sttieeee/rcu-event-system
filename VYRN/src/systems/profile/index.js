// =====================================================
// PROFILE SYSTEM - FIXED VERSION
// =====================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const PROFILE_TMP_PATH = `${PROFILE_PATH}.tmp`;

const RESET_TIMEZONE = process.env.RESET_TIMEZONE || "Europe/Warsaw";
const DEBUG_PROFILE_VOICE = process.env.DEBUG_PROFILE_VOICE === "true";

let dbCache = null;
let writeQueue = Promise.resolve();

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[PROFILE] Data directory created: ${DATA_DIR}`);
}

// ====================== HELPERS ======================
const toSafeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeUser = (user = {}) => ({
  voice: toSafeNumber(user.voice, 0)
});

const normalizeDb = (db = {}) => {
  const normalized = { users: {} };

  if (!db.users || typeof db.users !== "object") return normalized;

  for (const [userId, data] of Object.entries(db.users)) {
    normalized.users[userId] = normalizeUser(data);
  }

  return normalized;
};

// ====================== LOAD ======================
function loadProfile() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      dbCache = { users: {} };
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
      console.log(`[PROFILE] Created profile.json`);
      return dbCache;
    }

    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { users: {} };

    dbCache = normalizeDb(parsed);
    return dbCache;
  } catch (err) {
    console.error(`[PROFILE] LOAD ERROR: ${err.message}`);
    dbCache = { users: {} };
    return dbCache;
  }
}

// ====================== SAVE ======================
function saveProfile() {
  if (!dbCache) return writeQueue;

  const snapshot = JSON.stringify(dbCache, null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(PROFILE_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(PROFILE_TMP_PATH, PROFILE_PATH);

        dbCache = null; // ważne: reset cache

        console.log(`[PROFILE] Saved profile.json`);
      } catch (err) {
        console.error(`[PROFILE] SAVE ERROR: ${err.message}`);
      }
    });

  return writeQueue;
}

async function flushProfile() {
  try {
    await writeQueue;
    console.log(`[PROFILE] Flushed`);
  } catch (err) {
    console.error(`[PROFILE] Flush error:`, err.message);
  }
}

// ====================== USER ======================
function ensureUser(userId) {
  if (!userId) return null;

  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = normalizeUser();
    saveProfile();
  } else {
    db.users[userId] = normalizeUser(db.users[userId]);
  }

  return db.users[userId];
}

// ====================== VOICE ======================
function addVoiceTime(userId, seconds) {
  const amount = Math.floor(Number(seconds));
  if (!userId || amount <= 0) return false;

  const user = ensureUser(userId);

  const old = user.voice;
  user.voice += amount;

  if (DEBUG_PROFILE_VOICE) {
    console.log(
      `[PROFILE][VOICE] ${userId} +${amount}s (${old}s → ${user.voice}s)`
    );
  }

  saveProfile();
  return true;
}

function getVoiceMinutes(userId) {
  const user = ensureUser(userId);
  return user ? Math.floor(user.voice / 60) : 0;
}

// ====================== INIT ======================
function init() {
  loadProfile();
  console.log("📁 Profile System loaded");

  process.on("SIGINT", async () => await flushProfile());
  process.on("SIGTERM", async () => await flushProfile());
}

// ====================== EXPORT ======================
module.exports = {
  init,
  loadProfile,
  saveProfile,
  flushProfile,
  ensureUser,
  addVoiceTime,
  getVoiceMinutes
};
