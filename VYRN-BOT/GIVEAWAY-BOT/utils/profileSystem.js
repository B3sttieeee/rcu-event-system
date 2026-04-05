const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ====================== INIT ======================
if (!fs.existsSync("/data")) {
  fs.mkdirSync("/data", { recursive: true });
  console.log("📁 Utworzono folder /data");
}

// ====================== CACHE ======================
let dbCache = null;

// ====================== LOAD & SAVE ======================
function loadProfile() {
  if (dbCache) return dbCache;

  if (!fs.existsSync(PROFILE_PATH)) {
    console.log("[PROFILE] profile.json nie istnieje → tworzę nowy pusty plik");
    const initial = { users: {} };
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(initial, null, 2));
    dbCache = initial;
    return dbCache;
  }

  try {
    dbCache = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf-8"));
    console.log(`[PROFILE] Załadowano ${Object.keys(dbCache.users || {}).length} użytkowników`);
  } catch (err) {
    console.error("❌ Błąd odczytu profile.json — tworzę nowy");
    dbCache = { users: {} };
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
  }
  return dbCache;
}

function saveProfile() {
  if (dbCache) {
    try {
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
    } catch (err) {
      console.error("❌ Błąd zapisu profile.json:", err.message);
    }
  }
}

// ====================== USER ======================
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

// ====================== FUNCTIONS ======================
function addVoiceTime(userId, seconds) {
  if (!userId || seconds <= 0) return;
  const user = ensureUser(userId);
  user.voice += seconds;
  user.daily.vc += seconds;
}

function addMessage(userId) {
  if (!userId) return;
  const user = ensureUser(userId);
  user.daily.msgs++;
}

function getDailyTier(streak) {
  return {
    vcRequired: 30 + (streak * 5),
    msgRequired: streak >= 5 ? 20 + (streak * 2) : 0
  };
}

function isDailyReady(userId) {
  const user = ensureUser(userId);
  const tier = getDailyTier(user.daily.streak || 0);
  const vcMinutes = Math.floor(user.daily.vc / 60);

  return (
    vcMinutes >= tier.vcRequired &&
    (tier.msgRequired === 0 || user.daily.msgs >= tier.msgRequired)
  );
}

async function claimDaily(userId, member = null) {
  const user = ensureUser(userId);
  const now = Date.now();

  if (!isDailyReady(userId)) {
    return { success: false, error: "not_ready" };
  }

  if (now - user.daily.lastClaim < 86400000) {
    return { success: false, error: "cooldown" };
  }

  user.daily.streak = (user.daily.streak || 0) + 1;
  const xp = Math.floor(150 + Math.random() * 150);

  if (member && !member.user.bot) {
    try {
      const { addXP } = require("./levelSystem");
      await addXP(member, xp);
    } catch (err) {
      console.error("❌ Błąd dodawania XP przy claimDaily:", err.message);
    }
  }

  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.lastClaim = now;

  saveProfile();

  return { success: true, xp, streak: user.daily.streak };
}

function startDailyReset() {
  let lastDay = new Date().getDate();

  setInterval(() => {
    const now = new Date();
    if (now.getDate() !== lastDay) {
      lastDay = now.getDate();
      const data = loadProfile();
      let count = 0;
      for (const id in data.users) {
        if (data.users[id].daily) {
          data.users[id].daily.msgs = 0;
          data.users[id].daily.vc = 0;
          count++;
        }
      }
      saveProfile();
      console.log(`🌅 Daily reset wykonany dla ${count} użytkowników`);
    }
  }, 60000);
}

// ====================== EXPORT ======================
module.exports = {
  loadProfile,
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  getDailyTier,
  startDailyReset,
  ensureUser
};
