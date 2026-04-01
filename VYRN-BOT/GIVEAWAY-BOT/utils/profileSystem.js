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

// ===== 🔥 DYNAMIC TIER =====
function getDailyTier(streak) {
  const vc = Math.min(10 + streak * 2, 120); // max 120 min
  const msgs = streak < 3 ? 0 : Math.floor(streak * 2);

  const min = 100 + streak * 25;
  const max = 200 + streak * 50;

  return {
    vc,
    msgs,
    reward: [min, max]
  };
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

// ===== READY CHECK =====
function isDailyReady(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  const tier = getDailyTier(user.streak);
  const vcMinutes = Math.floor(user.daily.vc / 60);

  return (
    vcMinutes >= tier.vc &&
    user.daily.msgs >= tier.msgs
  );
}

// ===== CLAIM =====
function claimDaily(userId) {
  const db = loadProfile();
  const user = getUser(db, userId);

  const now = Date.now();
  const oneDay = 86400000;

  // ===== RESET STREAK JEŚLI PRZEGAPIŁ 🔥
  if (user.lastDaily && (now - user.lastDaily > oneDay * 2)) {
    user.streak = 0;
  }

  if (now - user.lastDaily < oneDay) {
    return { error: true, msg: "⏳ Already claimed today" };
  }

  if (!isDailyReady(userId)) {
    return { error: true, msg: "❌ Complete daily first!" };
  }

  // ===== STREAK++
  user.streak++;

  user.lastDaily = now;

  // ===== REWARD
  const tier = getDailyTier(user.streak);
  const [min, max] = tier.reward;

  let xp = Math.floor(Math.random() * (max - min + 1)) + min;

  // 🔥 BONUS ZA STREAK
  const bonus = Math.floor(user.streak * 10);
  xp += bonus;

  // ===== RESET DAILY
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.notified = false;

  saveProfile(db);

  return {
    xp,
    streak: user.streak,
    bonus
  };
}

// ===== RESET MIDNIGHT
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
  getDailyTier,
  startDailyReset
};
