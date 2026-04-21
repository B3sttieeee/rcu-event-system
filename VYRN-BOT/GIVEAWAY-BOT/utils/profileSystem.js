const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "./data";
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");
const PROFILE_TMP_PATH = `${PROFILE_PATH}.tmp`;
const RESET_TIMEZONE = process.env.RESET_TIMEZONE || "Europe/Warsaw";
const DEBUG_PROFILE_VOICE = process.env.DEBUG_PROFILE_VOICE === "true";

// =====================================================
// INIT
// =====================================================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[PROFILE] Data directory ready: ${DATA_DIR}`);
}

// =====================================================
// CACHE & WRITE QUEUE
// =====================================================
let dbCache = null;
let writeQueue = Promise.resolve();
let resetInterval = null;
let lastResetDayKey = null;

// =====================================================
// HELPERS
// =====================================================
const toSafeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeDaily = (daily = {}) => ({
  msgs: toSafeNumber(daily.msgs, 0),
  vc: toSafeNumber(daily.vc, 0),
  streak: toSafeNumber(daily.streak, 0),
  lastClaim: toSafeNumber(daily.lastClaim, 0),
  notified: Boolean(daily.notified),
  lastNotifyAttemptAt: toSafeNumber(daily.lastNotifyAttemptAt, 0)
});

const normalizeUser = (user = {}) => ({
  voice: toSafeNumber(user.voice, 0),
  daily: normalizeDaily(user.daily)
});

const normalizeDb = (db = {}) => {
  const normalized = { users: {} };
  if (!db.users || typeof db.users !== "object") return normalized;

  for (const [userId, userData] of Object.entries(db.users)) {
    normalized.users[userId] = normalizeUser(userData);
  }
  return normalized;
};

const getCurrentDayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: RESET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

// =====================================================
// LOAD & SAVE
// =====================================================
function loadProfile() {
  if (dbCache) return dbCache;

  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      dbCache = { users: {} };
      fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
      console.log(`[PROFILE] Created new database: ${PROFILE_PATH}`);
      return dbCache;
    }

    const raw = fs.readFileSync(PROFILE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : { users: {} };
    dbCache = normalizeDb(parsed);
    return dbCache;
  } catch (error) {
    console.error(`[PROFILE] LOAD ERROR: ${error.message}`);
    dbCache = { users: {} };
    return dbCache;
  }
}

function saveProfile() {
  if (!dbCache) return writeQueue;

  const snapshot = JSON.stringify(dbCache, null, 2);
  writeQueue = writeQueue
    .catch(() => null)
    .then(async () => {
      try {
        await fs.promises.writeFile(PROFILE_TMP_PATH, snapshot, "utf8");
        await fs.promises.rename(PROFILE_TMP_PATH, PROFILE_PATH);
      } catch (error) {
        console.error(`[PROFILE] SAVE ERROR: ${error.message}`);
      }
    });

  return writeQueue;
}

async function flushProfile() {
  try {
    await writeQueue;
  } catch (e) {}
}

// =====================================================
// USER
// =====================================================
function ensureUser(userId) {
  if (!userId) return null;
  const db = loadProfile();

  if (!db.users[userId]) {
    db.users[userId] = normalizeUser();
    saveProfile();
  } else {
    db.users[userId] = normalizeUser(db.users[userId]);
  }
  return db.users[userId];
}

// =====================================================
// STATS
// =====================================================
function addVoiceTime(userId, seconds) {
  const amount = Math.floor(Number(seconds));
  if (!userId || !Number.isFinite(amount) || amount <= 0) return false;

  const user = ensureUser(userId);
  if (!user) return false;

  user.voice += amount;
  user.daily.vc += amount;

  if (DEBUG_PROFILE_VOICE) {
    console.log(`[PROFILE][VOICE] ${userId} +${amount}s | total=${user.voice}s | daily=${user.daily.vc}s`);
  }

  saveProfile();
  return true;
}

function addMessage(userId) {
  if (!userId) return false;
  const user = ensureUser(userId);
  if (!user) return false;

  user.daily.msgs += 1;
  saveProfile();
  return true;
}

function getVoiceMinutes(userId) {
  const user = ensureUser(userId);
  return user ? Math.floor(user.voice / 60) : 0;
}

// =====================================================
// DAILY LOGIC
// =====================================================
function getDailyTier(streak = 0) {
  const safeStreak = toSafeNumber(streak, 0);
  return {
    vcRequired: 30 + safeStreak * 5,
    msgRequired: safeStreak >= 5 ? 20 + safeStreak * 2 : 50 // domyślnie 50 wiadomości przy streak < 5
  };
}

function isDailyReady(userId) {
  const user = ensureUser(userId);
  if (!user) return false;

  const tier = getDailyTier(user.daily.streak);
  const vcMinutes = Math.floor(user.daily.vc / 60);

  return (
    vcMinutes >= tier.vcRequired &&
    user.daily.msgs >= tier.msgRequired
  );
}

// =====================================================
// CLAIM DAILY
// =====================================================
async function claimDaily(userId, member = null) {
  const user = ensureUser(userId);
  if (!user) return { success: false, error: "invalid_user" };

  if (!isDailyReady(userId)) {
    return { success: false, error: "not_ready", message: "Daily Quest nie jest jeszcze gotowy." };
  }

  const now = Date.now();
  if (now - user.daily.lastClaim < 86_400_000) { // 24h
    return { success: false, error: "cooldown", message: "Daily już dzisiaj odebrane." };
  }

  user.daily.streak += 1;
  const xp = 150 + Math.floor(Math.random() * 150);

  // Dodaj XP przez levelSystem
  if (member && !member.user.bot) {
    try {
      const { addXP } = require("./levelSystem");
      if (typeof addXP === "function") {
        await addXP(member, xp);
      }
    } catch (error) {
      console.error(`[PROFILE] XP ERROR: ${error.message}`);
    }
  }

  // Reset daily + notified
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.lastClaim = now;
  user.daily.notified = false;
  user.daily.lastNotifyAttemptAt = 0;

  saveProfile();

  return {
    success: true,
    xp,
    streak: user.daily.streak,
    message: `Otrzymałeś **${xp} XP** i przedłużyłeś streak do **${user.daily.streak} dni**!`,
    reward: `${xp} XP`
  };
}

// =====================================================
// RESET
// =====================================================
function runDailyReset() {
  const db = loadProfile();
  let count = 0;

  for (const user of Object.values(db.users)) {
    if (!user?.daily) continue;
    user.daily.msgs = 0;
    user.daily.vc = 0;
    user.daily.notified = false;
    user.daily.lastNotifyAttemptAt = 0;
    count++;
  }

  saveProfile();
  console.log(`[PROFILE] Daily reset completed for ${count} users`);
}

function startDailyReset() {
  if (resetInterval) return;

  loadProfile();
  lastResetDayKey = getCurrentDayKey();

  resetInterval = setInterval(() => {
    const currentDayKey = getCurrentDayKey();
    if (currentDayKey !== lastResetDayKey) {
      lastResetDayKey = currentDayKey;
      runDailyReset();
    }
  }, 60_000);

  console.log(`[PROFILE] Daily reset watcher started (${RESET_TIMEZONE})`);
}

// =====================================================
// PROCESS EXIT
// =====================================================
process.on("SIGINT", async () => {
  await flushProfile();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await flushProfile();
  process.exit(0);
});

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  loadProfile,
  saveProfile,
  flushProfile,
  ensureUser,
  addVoiceTime,
  addMessage,
  getVoiceMinutes,
  getDailyTier,
  isDailyReady,
  claimDaily,
  startDailyReset,
  runDailyReset
};
