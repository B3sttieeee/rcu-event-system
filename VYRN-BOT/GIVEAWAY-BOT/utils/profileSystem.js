const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const PROFILE_PATH = path.join(DATA_DIR, "profile.json");

// ====================== INICJALIZACJA ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== CACHE ======================
let dbCache = null;
let lastSave = Date.now();

// ====================== LOAD & SAVE ======================
function loadProfile() {
  if (dbCache) return dbCache;

  if (!fs.existsSync(PROFILE_PATH)) {
    const initialData = { users: {} };
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(initialData, null, 2));
    dbCache = initialData;
    return dbCache;
  }

  try {
    dbCache = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf-8"));
  } catch (err) {
    console.error("❌ Błąd odczytu profile.json — tworzę nowy plik");
    dbCache = { users: {} };
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
  }

  return dbCache;
}

function saveProfile() {
  if (!dbCache) return;
  try {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(dbCache, null, 2));
    lastSave = Date.now();
  } catch (err) {
    console.error("❌ Błąd zapisu profile.json:", err.message);
  }
}

// Auto-save co 10 sekund (lepsze niż co 5)
setInterval(() => {
  if (Date.now() - lastSave > 8000) { // tylko jeśli coś się zmieniło
    saveProfile();
  }
}, 10000);

// ====================== USER MANAGEMENT ======================
function ensureUser(userId) {
  const data = loadProfile();
  if (!data.users[userId]) {
    data.users[userId] = {
      voice: 0,                    // całkowity czas na VC (w sekundach)
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

// ====================== VOICE & MESSAGE ======================
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

// ====================== DAILY SYSTEM ======================
function getDailyTier(streak) {
  return {
    vcRequired: 30 + (streak * 5),           // minuty
    msgRequired: streak >= 5 ? 20 + (streak * 2) : 0
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

async function claimDaily(userId, member = null) {
  const user = ensureUser(userId);
  const now = Date.now();

  // Sprawdzenie czy daily jest gotowy
  if (!isDailyReady(userId)) {
    return { success: false, error: "not_ready" };
  }

  // Ochrona przed spamem claimu (1x na 24h)
  if (now - user.daily.lastClaim < 86400000) { // 24 godziny
    return { success: false, error: "cooldown" };
  }

  // Przyznaj nagrodę
  user.daily.streak = (user.daily.streak || 0) + 1;
  const xpReward = Math.floor(150 + Math.random() * 150); // 150–299 XP

  // Dodaj XP do systemu poziomów (jeśli member jest dostępny)
  if (member && !member.user.bot) {
    try {
      const { addXP } = require("./levelSystem");
      await addXP(member, xpReward);
    } catch (err) {
      console.error(`❌ Nie udało się dodać XP przy claimDaily dla ${userId}:`, err.message);
    }
  }

  // Reset daily progress
  user.daily.msgs = 0;
  user.daily.vc = 0;
  user.daily.lastClaim = now;

  saveProfile();

  return {
    success: true,
    xp: xpReward,
    streak: user.daily.streak
  };
}

// ====================== DAILY RESET ======================
function startDailyReset() {
  let lastResetDay = new Date().getDate();

  setInterval(() => {
    const now = new Date();

    if (now.getDate() !== lastResetDay) {
      lastResetDay = now.getDate();

      const data = loadProfile();
      let resetCount = 0;

      for (const userId in data.users) {
        if (data.users[userId].daily) {
          data.users[userId].daily.msgs = 0;
          data.users[userId].daily.vc = 0;
          resetCount++;
        }
      }

      saveProfile();
      console.log(`🌅 Daily reset wykonany dla ${resetCount} użytkowników`);
    }
  }, 60000); // sprawdzaj co minutę
}

// ====================== EXPORT ======================
module.exports = {
  addVoiceTime,
  addMessage,
  isDailyReady,
  claimDaily,
  getDailyTier,
  startDailyReset,
  loadProfile,     // przydatne do komend statystyk
  ensureUser
};
