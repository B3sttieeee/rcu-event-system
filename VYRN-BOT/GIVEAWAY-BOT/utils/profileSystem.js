const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== INIT =====
function loadProfile() {
  if (!fs.existsSync("/data")) fs.mkdirSync("/data");

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({ users: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(PROFILE_PATH));
}

function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== INIT USER (NAJWAŻNIEJSZE 🔥)
function ensureUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      streak: 0,
      lastClaim: 0,
      daily: {
        msgs: 0,
        vc: 0,
        completed: false
      }
    };
  }

  // FIX brakujących pól (ważne dla starej bazy)
  const u = db.users[userId];

  if (u.streak === undefined) u.streak = 0;
  if (!u.daily) {
    u.daily = { msgs: 0, vc: 0, completed: false };
  }
}

// ===== TIER SYSTEM 🔥
function getDailyTier(streak = 0) {
  const tier = Math.floor(streak / 5);

  let vcRequired = 10 + tier * 5;
  let msgRequired = tier >= 1 ? 20 + tier * 10 : 0;

  return {
    vcRequired,
    msgRequired
  };
}

// ===== ADD VOICE =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();
  ensureUser(db, userId);

  const user = db.users[userId];

  user.voice += seconds;
  user.daily.vc += seconds;

  checkDaily(user);

  saveProfile(db);
}

// ===== ADD MESSAGE =====
function addMessage(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  const user = db.users[userId];

  user.daily.msgs++;

  checkDaily(user);

  saveProfile(db);
}

// ===== CHECK DAILY =====
function checkDaily(user) {
  const tier = getDailyTier(user.streak);

  const vcOk = user.daily.vc >= tier.vcRequired * 60;
  const msgOk = tier.msgRequired === 0 || user.daily.msgs >= tier.msgRequired;

  if (vcOk && msgOk) {
    user.daily.completed = true;
  }
}

// ===== CLAIM DAILY 🔥
function claimDaily(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  const user = db.users[userId];

  if (!user.daily.completed) {
    return {
      error: true,
      msg: "❌ Musisz najpierw ukończyć daily!"
    };
  }

  const now = Date.now();

  // reset streak jeśli minął dzień
  if (now - user.lastClaim > 86400000 * 2) {
    user.streak = 0;
  }

  user.streak++;

  const tier = getDailyTier(user.streak);

  // 🔥 LOSOWY XP (skalowany streakiem)
  const base = 200 + user.streak * 50;
  const xp = Math.floor(Math.random() * base) + base;

  // reset daily
  user.daily = {
    msgs: 0,
    vc: 0,
    completed: false
  };

  user.lastClaim = now;

  saveProfile(db);

  return {
    xp,
    streak: user.streak,
    tier
  };
}

// ===== CHECK READY =====
function isDailyReady(userId) {
  const db = loadProfile();
  ensureUser(db, userId);

  return db.users[userId].daily.completed;
}

// ===== RESET DAILY AUTO =====
function resetDaily() {
  const db = loadProfile();

  for (const id in db.users) {
    const user = db.users[id];

    // reset streak jeśli nie odebrał
    if (Date.now() - user.lastClaim > 86400000) {
      user.streak = 0;
    }

    user.daily = {
      msgs: 0,
      vc: 0,
      completed: false
    };
  }

  saveProfile(db);
}

// ===== EXPORT =====
module.exports = {
  addVoiceTime,
  addMessage,
  claimDaily,
  isDailyReady,
  resetDaily,
  getDailyTier
};
