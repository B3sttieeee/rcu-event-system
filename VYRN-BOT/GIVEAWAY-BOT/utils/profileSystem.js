const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== INIT =====
function ensure() {
  if (!fs.existsSync("/data")) fs.mkdirSync("/data", { recursive: true });

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({
      users: {}
    }, null, 2));
  }
}

// ===== LOAD / SAVE =====
function loadProfile() {
  ensure();
  return JSON.parse(fs.readFileSync(PROFILE_PATH));
}

function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== USER =====
function getUser(db, id) {
  if (!db.users[id]) {
    db.users[id] = {
      voice: 0,
      lastDaily: 0,
      streak: 0,
      notified: false,
      daily: {
        msgs: 0,
        vc: 0
      }
    };
  }
  return db.users[id];
}

// ===== MESSAGE =====
function addMessage(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  user.daily.msgs++;
  user.notified = false;

  saveProfile(db);
}

// ===== VOICE =====
function addVoiceTime(member, seconds) {
  const db = loadProfile();
  const user = getUser(db, member.id);

  user.voice += seconds;
  user.daily.vc += seconds;
  user.notified = false;

  saveProfile(db);
}

// ===== DAILY READY =====
function isDailyReady(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  return user.daily.msgs >= 50 && user.daily.vc >= 1800;
}

// ===== CLAIM DAILY =====
function claimDaily(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  const now = Date.now();
  const oneDay = 86400000;

  if (now - user.lastDaily < oneDay) {
    return { error: true, msg: "⏳ Already claimed today" };
  }

  if (!isDailyReady(userId)) {
    return { error: true, msg: "❌ Complete daily first!" };
  }

  // STREAK
  if (now - user.lastDaily < oneDay * 2) {
    user.streak++;
  } else {
    user.streak = 1;
  }

  user.lastDaily = now;

  // XP LOSOWY
  const base = 100;
  const bonus = user.streak * 75;
  const xp = Math.floor(Math.random() * (base + bonus)) + base;

  // RESET DAILY
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.notified = false;

  saveProfile(db);

  return {
    xp,
    streak: user.streak
  };
}

// ===== AUTO RESET =====
function startDailyReset() {
  setInterval(() => {
    const now = new Date();

    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const db = loadProfile();

      for (const id in db.users) {
        db.users[id].daily.msgs = 0;
        db.users[id].daily.vc = 0;
        db.users[id].notified = false;
      }

      saveProfile(db);
      console.log("🌙 Daily reset!");
    }
  }, 60000);
}

module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  startDailyReset
};
