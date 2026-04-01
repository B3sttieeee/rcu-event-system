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

// ===== TIER SYSTEM 🔥
function getDailyTier(streak) {
  if (streak >= 15) return { vc: 60, msgs: 40, reward: [800, 1200] };
  if (streak >= 10) return { vc: 45, msgs: 30, reward: [500, 900] };
  if (streak >= 5) return { vc: 30, msgs: 15, reward: [300, 600] };
  if (streak >= 2) return { vc: 20, msgs: 5, reward: [150, 300] };

  // TIER 1 – tylko VC
  return { vc: 10, msgs: 0, reward: [80, 150] };
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

// ===== CHECK READY =====
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

  if (now - user.lastDaily < oneDay) {
    return { error: true, msg: "⏳ Already claimed today" };
  }

  if (!isDailyReady(userId)) {
    return { error: true, msg: "❌ Complete daily first!" };
  }

  // ===== STREAK =====
  if (now - user.lastDaily < oneDay * 2) {
    user.streak++;
  } else {
    user.streak = 1;
  }

  user.lastDaily = now;

  // ===== REWARD =====
  const tier = getDailyTier(user.streak);
  const [min, max] = tier.reward;

  const xp = Math.floor(Math.random() * (max - min + 1)) + min;

  // ===== RESET =====
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.notified = false;

  saveProfile(db);

  return {
    xp,
    streak: user.streak,
    tier
  };
}

// ===== RESET MIDNIGHT =====
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
