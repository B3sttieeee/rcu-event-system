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

// ===== VOICE TIME =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false }
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
      daily: { msgs: 0, vc: 0, completed: false }
    };
  }

  db.users[userId].daily.msgs++;

  saveProfile(db);
}

// ===== RESET DAILY =====
function resetDaily() {
  const db = loadProfile();

  for (const id in db.users) {
    db.users[id].daily = {
      msgs: 0,
      vc: 0,
      completed: false
    };
  }

  saveProfile(db);
}

module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  resetDaily
};
