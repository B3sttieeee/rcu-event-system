const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== INIT SAFE =====
function loadProfile() {
  if (!fs.existsSync("/data")) fs.mkdirSync("/data");

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({ users: {} }, null, 2));
  }

  const data = JSON.parse(fs.readFileSync(PROFILE_PATH));

  // 🔥 AUTO FIX STARYCH DANYCH
  for (const id in data.users) {
    const u = data.users[id];

    if (typeof u.voice !== "number") u.voice = 0;

    if (!u.daily) {
      u.daily = {
        msgs: 0,
        vc: 0,
        completed: false,
        streak: 0,
        lastClaim: 0
      };
    }

    if (typeof u.daily.msgs !== "number") u.daily.msgs = 0;
    if (typeof u.daily.vc !== "number") u.daily.vc = 0;
    if (typeof u.daily.completed !== "boolean") u.daily.completed = false;
    if (typeof u.daily.streak !== "number") u.daily.streak = 0;
    if (typeof u.daily.lastClaim !== "number") u.daily.lastClaim = 0;
  }

  return data;
}

function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== DAILY TIERS (DYNAMIC 🔥) =====
function getDailyTier(streak) {
  const tier = Math.floor(streak / 3) + 1;

  const voiceRequired = 300 + (tier * 120); // rośnie
  const messagesRequired = tier >= 5 ? 20 + (tier * 5) : 0;

  return {
    tier,
    voiceRequired,
    messagesRequired
  };
}

// ===== VOICE =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, streak: 0, lastClaim: 0 }
    };
  }

  const tier = getDailyTier(db.users[userId].daily.streak);

  db.users[userId].voice += seconds;
  db.users[userId].daily.vc += seconds;

  // COMPLETE CHECK
  if (
    db.users[userId].daily.vc >= tier.voiceRequired &&
    db.users[userId].daily.msgs >= tier.messagesRequired
  ) {
    db.users[userId].daily.completed = true;
  }

  saveProfile(db);
}

// ===== MESSAGE =====
function addMessage(userId) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, streak: 0, lastClaim: 0 }
    };
  }

  const tier = getDailyTier(db.users[userId].daily.streak);

  db.users[userId].daily.msgs++;

  // COMPLETE CHECK
  if (
    db.users[userId].daily.vc >= tier.voiceRequired &&
    db.users[userId].daily.msgs >= tier.messagesRequired
  ) {
    db.users[userId].daily.completed = true;
  }

  saveProfile(db);
}

// ===== CLAIM DAILY =====
function claimDaily(userId) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: { msgs: 0, vc: 0, completed: false, streak: 0, lastClaim: 0 }
    };
  }

  const user = db.users[userId];
  const now = Date.now();

  if (!user.daily.completed) {
    return { error: true, msg: "❌ Daily not completed!" };
  }

  // RESET STREAK jeśli minął dzień
  if (now - user.daily.lastClaim > 86400000 * 2) {
    user.daily.streak = 0;
  }

  user.daily.streak++;
  user.daily.lastClaim = now;

  // 🔥 XP SKALOWANE ZE STREAKIEM
  const baseXP = 100;
  const xp = Math.floor(baseXP + (user.daily.streak * 50));

  // RESET DAILY
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.completed = false;

  saveProfile(db);

  return {
    xp,
    streak: user.daily.streak
  };
}

// ===== GET PROGRESS =====
function getProgress(userId) {
  const db = loadProfile();

  if (!db.users[userId]) {
    return {
      msgs: 0,
      vc: 0,
      completed: false,
      streak: 0,
      tier: getDailyTier(0)
    };
  }

  const user = db.users[userId];
  const tier = getDailyTier(user.daily.streak);

  return {
    msgs: user.daily.msgs,
    vc: user.daily.vc,
    completed: user.daily.completed,
    streak: user.daily.streak,
    tier
  };
}

// ===== EXPORT =====
module.exports = {
  addVoiceTime,
  addMessage,
  claimDaily,
  getProgress
};
