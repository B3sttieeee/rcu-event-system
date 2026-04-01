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

// ===== GET USER =====
function getUser(id) {
  const db = loadProfile();

  if (!db.users[id]) {
    db.users[id] = {
      voice: 0,
      streak: 0,
      lastDaily: 0,
      daily: {
        msgs: 0,
        vc: 0,
        completed: false
      }
    };
  }

  saveProfile(db);
  return db.users[id];
}

// ===== DAILY TIER SYSTEM (DYNAMIC 🔥) =====
function getDailyTier(streak = 0) {
  const tier = Math.floor(streak / 2);

  return {
    tier,

    // 🎤 rośnie zawsze
    voiceRequired: 10 + tier * 5,

    // 💬 od tier 5
    messagesRequired: tier >= 5 ? 20 + (tier - 5) * 10 : 0,

    // 💰 XP rośnie mocno
    rewardXP: 100 + (tier * 150) + (streak * 50)
  };
}

// ===== ADD VOICE =====
function addVoiceTime(userId, seconds) {
  const db = loadProfile();
  const user = getUser(userId);

  user.voice += seconds;
  user.daily.vc += seconds;

  saveProfile(db);
}

// ===== ADD MESSAGE =====
function addMessage(userId) {
  const db = loadProfile();
  const user = getUser(userId);

  user.daily.msgs++;

  saveProfile(db);
}

// ===== CHECK READY =====
function isDailyReady(userId) {
  const user = getUser(userId);
  const tier = getDailyTier(user.streak);

  const vcOK = user.daily.vc >= tier.voiceRequired * 60;
  const msgOK = user.daily.msgs >= tier.messagesRequired;

  return vcOK && msgOK;
}

// ===== CLAIM DAILY =====
function claimDaily(userId) {
  const db = loadProfile();
  const user = getUser(userId);
  const tier = getDailyTier(user.streak);

  const now = Date.now();

  if (!isDailyReady(userId)) {
    return {
      error: true,
      msg: "❌ Daily nie jest jeszcze ukończone!"
    };
  }

  // 🔥 streak reset jeśli minął dzień
  if (user.lastDaily && now - user.lastDaily > 86400000 * 2) {
    user.streak = 0;
  }

  user.streak++;
  user.lastDaily = now;

  // reset progressu
  user.daily = {
    msgs: 0,
    vc: 0,
    completed: false
  };

  saveProfile(db);

  return {
    xp: tier.rewardXP,
    streak: user.streak
  };
}

// ===== AUTO RESET O PÓŁNOCY =====
function startDailyReset() {
  setInterval(() => {
    const now = new Date();

    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const db = loadProfile();

      for (const id in db.users) {
        db.users[id].daily = {
          msgs: 0,
          vc: 0,
          completed: false
        };
      }

      saveProfile(db);
      console.log("🌙 Daily reset wykonany");
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
