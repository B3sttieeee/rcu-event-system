const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== LOAD =====
function loadProfile() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
  }

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

// ===== ENSURE USER =====
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

  // FIX starych danych
  if (!db.users[userId].daily) {
    db.users[userId].daily = {
      msgs: 0,
      vc: 0,
      completed: false,
      streak: 0,
      lastClaim: 0
    };
  }

  if (typeof db.users[userId].daily.vc !== "number") db.users[userId].daily.vc = 0;
  if (typeof db.users[userId].daily.msgs !== "number") db.users[userId].daily.msgs = 0;
  if (typeof db.users[userId].daily.streak !== "number") db.users[userId].daily.streak = 0;
}

// ===== VOICE =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();
  ensureUser(db, userId);

  db.users[userId].voice += seconds;
  db.users[userId].daily.vc += seconds;

  saveProfile(db);
}

// ===== MESSAGE =====
function addMessage(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  db.users[userId].daily.msgs++;

  saveProfile(db);
}

// ===== TIER SYSTEM (DYNAMICZNY 🔥)
function getDailyTier(streak) {
  const tier = Math.floor(streak / 2) + 1;

  return {
    tier,
    requiredVC: 10 + (tier * 5), // 10,15,20,25...
    requiredMsgs: tier >= 5 ? (20 + tier * 5) : 0 // od tier 5
  };
}

// ===== CHECK READY =====
function isDailyReady(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  const user = db.users[userId];
  const tierData = getDailyTier(user.daily.streak);

  const vcMin = user.daily.vc / 60;

  const vcOk = vcMin >= tierData.requiredVC;
  const msgOk = tierData.requiredMsgs === 0 || user.daily.msgs >= tierData.requiredMsgs;

  if (vcOk && msgOk) {
    user.daily.completed = true;
    saveProfile(db);
    return true;
  }

  return false;
}

// ===== CLAIM =====
function claimDaily(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  const user = db.users[userId];

  if (!isDailyReady(userId)) {
    return {
      error: true,
      msg: "❌ Daily nie jest jeszcze ukończone!"
    };
  }

  const now = Date.now();

  // 🔥 RESET STREAK jeśli minął dzień
  if (user.daily.lastClaim) {
    const diff = now - user.daily.lastClaim;

    if (diff > 86400000 * 1.5) {
      user.daily.streak = 0;
    }
  }

  user.daily.streak++;

  const tierData = getDailyTier(user.daily.streak);

  // 💰 LOSOWY XP (ROSNIE ZE STREAKIEM)
  const baseXP = 100 + (tierData.tier * 50);
  const xp = Math.floor(baseXP + Math.random() * baseXP);

  // reset daily
  user.daily = {
    msgs: 0,
    vc: 0,
    completed: false,
    streak: user.daily.streak,
    lastClaim: now
  };

  saveProfile(db);

  return {
    xp,
    streak: user.daily.streak
  };
}

// ===== RESET AUTO O PÓŁNOCY =====
function startDailyReset() {
  setInterval(() => {
    const now = new Date();

    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const db = loadProfile();

      for (const id in db.users) {
        db.users[id].daily.msgs = 0;
        db.users[id].daily.vc = 0;
        db.users[id].daily.completed = false;
      }

      saveProfile(db);
      console.log("🌙 Daily reset!");
    }
  }, 60000);
}

// ===== EXPORT =====
module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  getDailyTier,
  startDailyReset
};
