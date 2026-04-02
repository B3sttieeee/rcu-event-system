const fs = require("fs");

const DATA_DIR = "/data";
const PROFILE_PATH = `${DATA_DIR}/profile.json`;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// CACHE
let db = null;

// =========================
// LOAD
// =========================
function loadProfile() {
  if (db) return db;

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({ users: {} }, null, 2));
  }

  db = JSON.parse(fs.readFileSync(PROFILE_PATH));
  return db;
}

// =========================
// SAVE
// =========================
function saveProfile() {
  if (!db) return;
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(db, null, 2));
}

// AUTO SAVE
setInterval(() => {
  saveProfile();
}, 5000);

// =========================
// USER
// =========================
function ensureUser(userId) {
  const data = loadProfile();

  if (!data.users[userId]) {
    data.users[userId] = {
      voice: 0,
      daily: {
        msgs: 0,
        vc: 0,
        streak: 0,
        lastClaim: 0
      }
    };
  }

  return data.users[userId];
}

// =========================
// VOICE
// =========================
function addVoiceTime(userId, seconds) {
  const user = ensureUser(userId);

  user.voice += seconds;
  user.daily.vc += seconds;
}

// =========================
// MESSAGE
// =========================
function addMessage(userId) {
  const user = ensureUser(userId);
  user.daily.msgs++;
}

// =========================
// DAILY
// =========================
function getDailyTier(streak) {
  return {
    vcRequired: 30 + (streak * 5),
    msgRequired: streak >= 5 ? 20 + (streak * 2) : 0
  };
}

function isDailyReady(userId) {
  const user = ensureUser(userId);
  const tier = getDailyTier(user.daily.streak);

  return (
    user.daily.vc >= tier.vcRequired * 60 &&
    (tier.msgRequired === 0 || user.daily.msgs >= tier.msgRequired)
  );
}

// =========================
// CLAIM (FIXED 🔥)
// =========================
async function claimDaily(userId, member = null) {
  const user = ensureUser(userId);

  if (!isDailyReady(userId)) {
    return { error: true };
  }

  // ❌ zabezpieczenie przed spamem (1x dziennie)
  const now = Date.now();
  if (now - user.daily.lastClaim < 86400000) {
    return { error: "cooldown" };
  }

  user.daily.streak++;

  const xp = Math.floor(150 + Math.random() * 150);

  // 🔥 DODAJ XP DO LEVEL SYSTEM
  if (member) {
    try {
      const { addXP } = require("./levelSystem");
      await addXP(member, xp);
    } catch {}
  }

  // reset daily
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.lastClaim = now;

  saveProfile();

  return {
    xp,
    streak: user.daily.streak
  };
}

// =========================
// RESET
// =========================
function startDailyReset() {
  let lastDay = new Date().getDate();

  setInterval(() => {
    const now = new Date();

    if (now.getDate() !== lastDay) {
      lastDay = now.getDate();

      const data = loadProfile();

      for (const id in data.users) {
        data.users[id].daily.msgs = 0;
        data.users[id].daily.vc = 0;
      }

      saveProfile();
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
