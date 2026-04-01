const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== INIT =====
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

// ===== GET USER (ANTI-UNDEFINED FIX 🔥)
function getUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      lastDaily: 0,
      streak: 0,
      daily: {
        msgs: 0,
        vc: 0,
        completed: false
      }
    };
  }

  // 🔥 FIX brakujących danych (stare konta)
  const user = db.users[userId];

  if (!user.daily) {
    user.daily = { msgs: 0, vc: 0, completed: false };
  }

  if (typeof user.streak !== "number") user.streak = 0;
  if (typeof user.lastDaily !== "number") user.lastDaily = 0;

  return user;
}

// ===== TIER SYSTEM (DYNAMIC 🔥)
function getDailyRequirement(streak) {
  const tier = Math.floor(streak / 5);

  const voiceRequired = 10 + (tier * 10); // 10,20,30...
  const messagesRequired = tier >= 1 ? 20 + (tier * 10) : 0; // od 5 streaka

  return {
    voice: voiceRequired * 60,
    messages: messagesRequired
  };
}

// ===== PROGRESS =====
function getProgress(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  const req = getDailyRequirement(user.streak);

  const voicePercent = Math.min(100, Math.floor((user.daily.vc / req.voice) * 100 || 0));
  const msgPercent = req.messages > 0
    ? Math.min(100, Math.floor((user.daily.msgs / req.messages) * 100 || 0))
    : 100;

  const completed = voicePercent >= 100 && msgPercent >= 100;

  if (completed) user.daily.completed = true;

  saveProfile(db);

  return {
    voice: user.daily.vc,
    messages: user.daily.msgs,
    voiceRequired: req.voice,
    messagesRequired: req.messages,
    voicePercent,
    msgPercent,
    completed,
    streak: user.streak
  };
}

// ===== ADD VOICE =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();
  const user = getUser(db, userId);

  user.voice += seconds;
  user.daily.vc += seconds;

  saveProfile(db);
}

// ===== ADD MESSAGE =====
function addMessage(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  user.daily.msgs++;

  saveProfile(db);
}

// ===== CLAIM DAILY =====
function claimDaily(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  const now = Date.now();
  const day = 86400000;

  const progress = getProgress(userId);

  if (!progress.completed) {
    return { error: true, msg: "❌ Daily not completed!" };
  }

  // 🔥 STREAK RESET (jeśli minął dzień)
  if (user.lastDaily && now - user.lastDaily > day * 2) {
    user.streak = 0;
  }

  user.streak++;

  // 🎁 XP SCALING
  const base = 100 + (user.streak * 50);
  const random = Math.floor(Math.random() * base);

  const xp = base + random;

  user.lastDaily = now;

  // RESET DAILY
  user.daily = {
    msgs: 0,
    vc: 0,
    completed: false
  };

  saveProfile(db);

  return {
    xp,
    streak: user.streak
  };
}

// ===== CHECK READY =====
function isDailyReady(userId) {
  const progress = getProgress(userId);
  return progress.completed;
}

// ===== RESET ALL (opcjonalny cron)
function resetDailyAll() {
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

// ===== EXPORT =====
module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  claimDaily,
  isDailyReady,
  getProgress,
  resetDailyAll
};
