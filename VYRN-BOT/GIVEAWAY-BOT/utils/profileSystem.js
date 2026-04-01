const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

function loadProfile() {
  if (!fs.existsSync("/data")) fs.mkdirSync("/data");

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({
      users: {}
    }, null, 2));
  }

  return JSON.parse(fs.readFileSync(PROFILE_PATH));
}

function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== INIT USER =====
function ensureUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: {
        msgs: 0,
        vc: 0,
        claimed: false
      }
    };
  }
}

// ===== VOICE TIME =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();
  ensureUser(db, userId);

  db.users[userId].voice += seconds;
  db.users[userId].daily.vc += seconds;

  saveProfile(db);
}

// ===== MESSAGE COUNT =====
function addMessage(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  db.users[userId].daily.msgs++;

  saveProfile(db);
}

// ===== CHECK DAILY READY =====
function isDailyReady(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  const user = db.users[userId];

  return (
    user.daily.msgs >= 50 &&
    user.daily.vc >= 1800 && // 30 min
    !user.daily.claimed
  );
}

// ===== CLAIM DAILY =====
function claimDaily(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  if (!isDailyReady(userId)) return false;

  db.users[userId].daily.claimed = true;

  saveProfile(db);
  return true;
}

// ===== RESET DAILY =====
function resetDaily() {
  const db = loadProfile();

  for (const id in db.users) {
    db.users[id].daily = {
      msgs: 0,
      vc: 0,
      claimed: false
    };
  }

  saveProfile(db);
}

module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  resetDaily
};
