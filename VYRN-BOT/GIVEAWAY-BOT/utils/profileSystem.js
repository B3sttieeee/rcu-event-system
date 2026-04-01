const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== LOAD =====
function loadProfile() {
  if (!fs.existsSync("/data")) fs.mkdirSync("/data");

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({
      users: {}
    }, null, 2));
  }

  return JSON.parse(fs.readFileSync(PROFILE_PATH));
}

// ===== SAVE =====
function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== VOICE TIME =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, lastClaim: 0 }
    };
  }

  db.users[userId].voice += seconds;
  db.users[userId].daily.vc += seconds;

  saveProfile(db);
}

// ===== MESSAGE COUNT =====
function addMessage(userId) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, lastClaim: 0 }
    };
  }

  db.users[userId].daily.msgs++;

  saveProfile(db);
}

// ===== CLAIM DAILY 🔥
function claimDaily(userId) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, lastClaim: 0 }
    };
  }

  const user = db.users[userId];

  const REQUIRED_MSGS = 50;
  const REQUIRED_VC = 1800; // 30 min

  // ❌ nie spełnił wymagań
  if (user.daily.msgs < REQUIRED_MSGS || user.daily.vc < REQUIRED_VC) {
    return { ok: false, reason: "not_ready" };
  }

  const now = Date.now();
  const ONE_DAY = 86400000;

  // ❌ już odebrane
  if (now - user.daily.lastClaim < ONE_DAY) {
    return { ok: false, reason: "cooldown" };
  }

  // ✅ CLAIM
  user.daily.lastClaim = now;
  user.daily.completed = true;

  // RESET
  user.daily.msgs = 0;
  user.daily.vc = 0;

  saveProfile(db);

  return { ok: true };
}

// ===== RESET DAILY (AUTO) =====
function resetDaily() {
  const db = loadProfile();

  for (const id in db.users) {
    db.users[id].daily.msgs = 0;
    db.users[id].daily.vc = 0;
    db.users[id].daily.completed = false;
  }

  saveProfile(db);
}

// ===== EXPORT =====
module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  claimDaily, // 🔥 NAJWAŻNIEJSZE
  resetDaily
};
