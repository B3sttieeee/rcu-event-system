// src/systems/profile/index.js
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");

let dbCache = null;

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[PROFILE] Data directory created: ${DATA_DIR}`);
}

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
    dbCache = parsed;
    if (!dbCache.users) dbCache.users = {};
    return dbCache;
  } catch (error) {
    console.error(`[PROFILE] LOAD ERROR: ${error.message}`);
    dbCache = { users: {} };
    return dbCache;
  }
}

function saveProfile() {
  if (!dbCache) return;

  try {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
    console.log(`[PROFILE] Zapisano profile.json`);
  } catch (error) {
    console.error(`[PROFILE] SAVE ERROR: ${error.message}`);
  }
}

function ensureUser(userId) {
  if (!userId) return null;

  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = { voice: 0 };
    saveProfile();
    console.log(`[PROFILE] Utworzono nowy profil dla ${userId}`);
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

  console.log(`[PROFILE][VOICE] ${userId} +${amount}s | ${oldVoice} → ${user.voice}s`);

  saveProfile();
  return true;
}

function getVoiceMinutes(userId) {
  const user = ensureUser(userId);
  const minutes = user ? Math.floor(user.voice / 60) : 0;
  console.log(`[PROFILE] getVoiceMinutes(${userId}) = ${minutes} minut`);
  return minutes;
}

// ====================== INIT ======================
function init() {
  loadProfile();
  console.log("📁 Profile System → załadowany");
}

module.exports = {
  init,
  addVoiceTime,
  getVoiceMinutes
};
