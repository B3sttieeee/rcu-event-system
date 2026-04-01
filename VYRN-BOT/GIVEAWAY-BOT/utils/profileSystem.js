const fs = require("fs");

// 🔥 RAILWAY VOLUME PATH
const DATA_DIR = "/data";
const PROFILE_PATH = `${DATA_DIR}/profile.json`;

// =========================
// 📂 INIT
// =========================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// =========================
// 📂 LOAD + AUTO FIX
// =========================
function loadProfile() {
  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({
      users: {}
    }, null, 2));
  }

  const data = JSON.parse(fs.readFileSync(PROFILE_PATH));

  for (const id in data.users) {
    const user = data.users[id];

    if (!user.voice) user.voice = 0;

    if (!user.daily) {
      user.daily = {
        msgs: 0,
        vc: 0,
        completed: false,
        streak: 0,
        lastClaim: 0
      };
    }

    if (typeof user.daily.vc !== "number") user.daily.vc = 0;
    if (typeof user.daily.msgs !== "number") user.daily.msgs = 0;
    if (typeof user.daily.streak !== "number") user.daily.streak = 0;
    if (typeof user.daily.completed !== "boolean") user.daily.completed = false;
    if (typeof user.daily.lastClaim !== "number") user.daily.lastClaim = 0;
  }

  return data;
}

// =========================
// 💾 SAVE
// =========================
function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// =========================
// 👤 ENSURE USER
// =========================
function ensureUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: {
        msgs: 0,
        vc: 0,
        completed: false,
        streak: 0,
        lastClaim: 0
      }
    };
  }

  return db.users[userId];
}

// =========================
// 🎤 VOICE TIME
// =========================
function addVoiceTime(userId, seconds) {
  const db = loadProfile();
  const user = ensureUser(db, userId);

  user.voice += seconds;
  user.daily.vc += seconds;

  saveProfile(db);
}

// =========================
// 💬 MESSAGE COUNT
// =========================
function addMessage(userId) {
  const db = loadProfile();
  const user = ensureUser(db, userId);

  user.daily.msgs++;

  saveProfile(db);
}

// =========================
// 📊 DAILY TIER
// =========================
function getDailyTier(streak) {
  return {
    vcRequired: 30 + (streak * 5),
    msgRequired: streak >= 5 ? 20 + (streak * 2) : 0
  };
}

// =========================
// 🎯 READY CHECK
// =========================
function isDailyReady(userId) {
  const db = loadProfile();
  const user = ensureUser(db, userId);

  const tier = getDailyTier(user.daily.streak);

  const vcOk = user.daily.vc >= (tier.vcRequired * 60);
  const msgOk = tier.msgRequired === 0 || user.daily.msgs >= tier.msgRequired;

  return vcOk && msgOk;
}

// =========================
// 🎁 CLAIM DAILY
// =========================
function claimDaily(userId) {
  const db = loadProfile();
  const user = ensureUser(db, userId);

  const now = Date.now();
  const oneDay = 86400000;

  if (!isDailyReady(userId)) {
    return {
      error: true,
      msg: "❌ Najpierw ukończ daily!"
    };
  }

  // 🔥 streak reset >48h
  if (user.daily.lastClaim && now - user.daily.lastClaim > oneDay * 2) {
    user.daily.streak = 0;
  }

  user.daily.streak++;

  const baseXP = 100 + (user.daily.streak * 50);
  const randomXP = Math.floor(baseXP + Math.random() * baseXP);

  // reset
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.completed = false;
  user.daily.lastClaim = now;

  saveProfile(db);

  return {
    xp: randomXP,
    streak: user.daily.streak
  };
}

// =========================
// 🌙 RESET (MIDNIGHT SAFE)
// =========================
function startDailyReset() {
  let lastDay = new Date().getDate();

  setInterval(() => {
    const now = new Date();

    if (now.getDate() !== lastDay) {
      lastDay = now.getDate();

      const db = loadProfile();

      for (const id in db.users) {
        db.users[id].daily.msgs = 0;
        db.users[id].daily.vc = 0;
        db.users[id].daily.completed = false;
      }

      saveProfile(db);
      console.log("🌙 Daily reset done");
    }
  }, 60000);
}

// =========================
// 📤 EXPORT
// =========================
module.exports = {
  loadProfile,
  saveProfile,
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  getDailyTier,
  startDailyReset
};
