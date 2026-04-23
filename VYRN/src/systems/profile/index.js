// =====================================================
// PROFILE SYSTEM - PROFESSIONAL VERSION
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

// ====================== INIT ======================
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

const getCurrentDayKey = () => 
  new Intl.DateTimeFormat("en-CA", {
    timeZone: RESET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

// ====================== LOAD & SAVE ======================
function loadProfile() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      dbCache = { users: {} };
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
      console.log(`[PROFILE] Utworzono nowy plik profile.json`);
      return dbCache;
    }

    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { users: {} };
    dbCache = normalizeDb(parsed);
    return dbCache;
  } catch (error) {
    console.error(`[PROFILE] LOAD ERROR: ${error.message}`);
    dbCache = { users: {} };
    return dbCache;
  }
}

function saveProfile() {
  if (!dbCache) return writeQueue;

  const snapshot = JSON.stringify(dbCache, null, 2);

  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(PROFILE_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(PROFILE_TMP_PATH, PROFILE_PATH);
        dbCache = null;                    // Ważne - czyścimy cache po zapisie
        console.log(`[PROFILE] ✅ Zapisano profile.json`);
      } catch (error) {
        console.error(`[PROFILE] SAVE ERROR: ${error.message}`);
      }
    });

  return writeQueue;
}

async function flushProfile() {
  try {
    await writeQueue;
    console.log(`[PROFILE] Flushed on shutdown`);
  } catch (e) {
    console.error("[PROFILE] Flush error:", e.message);
  }
}

// ====================== USER MANAGEMENT ======================
function ensureUser(userId) {
  if (!userId) return null;

  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = normalizeUser();
    saveProfile();
    console.log(`[PROFILE] Utworzono nowy profil dla ${userId}`);
  } else {
    db.users[userId] = normalizeUser(db.users[userId]);
  }

  return db.users[userId];
}

// ====================== CORE FUNCTIONS ======================
function addVoiceTime(userId, seconds) {
  const amount = Math.floor(Number(seconds));
  if (!userId || amount <= 0) return false;

  const user = ensureUser(userId);
  const oldVoice = user.voice;
  user.voice += amount;

  if (DEBUG_PROFILE_VOICE) {
    console.log(`[PROFILE][VOICE] ${userId} +${amount}s | ${oldVoice}s → ${user.voice}s (${Math.floor(user.voice / 60)} minut)`);
  }

  saveProfile();
  return true;
}

function getVoiceMinutes(userId) {
  const user = ensureUser(userId);
  const minutes = user ? Math.floor(user.voice / 60) : 0;

  if (DEBUG_PROFILE_VOICE) {
    console.log(`[PROFILE] getVoiceMinutes(${userId}) → ${minutes} minut`);
  }

  return minutes;
}

// ====================== INIT ======================
function init() {
  loadProfile();
  console.log("📁 Profile System → załadowany (professional version)");
  
  // Auto flush przy wyłączeniu
  process.on("SIGINT", async () => { await flushProfile(); });
  process.on("SIGTERM", async () => { await flushProfile(); });
}

module.exports = {
  init,
  loadProfile,
  saveProfile,
  flushProfile,
  ensureUser,
  addVoiceTime,
  getVoiceMinutes
};
