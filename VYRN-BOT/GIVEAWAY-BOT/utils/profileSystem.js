const fs = require("fs");
const path = require("path");

const DATA_DIR = "/data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 Utworzono /data");
}

// ====================== CACHE ======================
let dbCache = null;
let writeQueue = Promise.resolve();

// ====================== IO ======================
function loadProfile() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      dbCache = { users: {} };
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
      console.log("[PROFILE] Nowa baza utworzona");
      return dbCache;
    }

    dbCache = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
    dbCache.users ||= {};

    console.log(`[PROFILE] Załadowano ${Object.keys(dbCache.users).length} users`);
    return dbCache;
  } catch (err) {
    console.error("❌ Profile load error → reset DB", err.message);
    dbCache = { users: {} };
    return dbCache;
  }
}

// serializacja zapisów (ważne przy Railway / concurrency)
function saveProfile() {
  if (!dbCache) return;

  writeQueue = writeQueue.then(() => {
    return new Promise((resolve) => {
      fs.writeFile(PROFILE_PATH, JSON.stringify(dbCache, null, 2), (err) => {
        if (err) console.error("❌ Save error:", err.message);
        resolve();
      });
    });
  });
}

// ====================== USER ======================
function ensureUser(userId) {
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = {
      voice: 0,
      daily: {
        msgs: 0,
        vc: 0,
        streak: 0,
        lastClaim: 0,
        notified: false,
      },
    };
  }

  return db.users[userId];
}

// ====================== STATS ======================
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

// ====================== DAILY LOGIC ======================
function getDailyTier(streak = 0) {
  return {
    vcRequired: 30 + streak * 5,
    msgRequired: streak >= 5 ? 20 + streak * 2 : 0,
  };
}

function isDailyReady(userId) {
  const user = ensureUser(userId);
  const tier = getDailyTier(user.daily.streak);
  const vcMinutes = Math.floor(user.daily.vc / 60);

  return (
    vcMinutes >= tier.vcRequired &&
    (tier.msgRequired === 0 || user.daily.msgs >= tier.msgRequired)
  );
}

// ====================== CLAIM ======================
async function claimDaily(userId, member = null) {
  const user = ensureUser(userId);
  const now = Date.now();

  if (!isDailyReady(userId)) {
    return { success: false, error: "not_ready" };
  }

  if (now - user.daily.lastClaim < 86_400_000) {
    return { success: false, error: "cooldown" };
  }

  user.daily.streak = (user.daily.streak || 0) + 1;
  const xp = 150 + Math.floor(Math.random() * 150);

  if (member && !member.user.bot) {
    try {
      const { addXP } = require("./levelSystem");
      await addXP(member, xp);
    } catch (err) {
      console.error("❌ XP error:", err.message);
    }
  }

  // reset
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.lastClaim = now;
  user.daily.notified = false;

  saveProfile();

  return {
    success: true,
    xp,
    streak: user.daily.streak,
  };
}

// ====================== DAILY RESET ======================
// lepszy niż sprawdzanie co minutę dnia
function startDailyReset() {
  const runReset = () => {
    const db = loadProfile();
    let count = 0;

    for (const user of Object.values(db.users)) {
      if (!user.daily) continue;

      user.daily.msgs = 0;
      user.daily.vc = 0;
      user.daily.notified = false;
      count++;
    }

    saveProfile();
    console.log(`🌅 Daily reset → ${count} users`);
  };

  const now = new Date();
  const msUntilMidnight =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      5
    ) - now;

  setTimeout(() => {
    runReset();
    setInterval(runReset, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log("⏱️ Daily reset scheduler started");
}

// ====================== EXPORT ======================
module.exports = {
  loadProfile,
  saveProfile,
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  getDailyTier,
  startDailyReset,
  ensureUser,
};
