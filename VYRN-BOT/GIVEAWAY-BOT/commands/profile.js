const fs = require("fs");

// ===== PATH =====
const DB_PATH = "/data/profile.json";

// ===== INIT =====
function ensureDB() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
  }
}

// ===== LOAD =====
function loadDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== GET USER =====
function getUser(db, id) {
  if (!db.users[id]) {
    db.users[id] = {
      voice: 0,
      daily: {
        msgs: 0,
        vc: 0,
        claimed: false,
        lastReset: Date.now()
      }
    };
  }
  return db.users[id];
}

// ===== RESET =====
function checkReset(user) {
  const now = new Date();
  const last = new Date(user.daily.lastReset);

  if (
    now.getDate() !== last.getDate() ||
    now.getMonth() !== last.getMonth() ||
    now.getFullYear() !== last.getFullYear()
  ) {
    user.daily.msgs = 0;
    user.daily.vc = 0;
    user.daily.claimed = false;
    user.daily.lastReset = Date.now();
  }
}

// ===== MESSAGE =====
function addMessage(member) {
  const db = loadDB();
  const user = getUser(db, member.id);

  checkReset(user);

  user.daily.msgs += 1;

  saveDB(db);
}

// ===== VOICE =====
function addVoiceTime(member, seconds) {
  const db = loadDB();
  const user = getUser(db, member.id);

  checkReset(user);

  user.voice += seconds;
  user.daily.vc += seconds;

  saveDB(db);
}

// ===== CLAIM DAILY (🔥 KLUCZOWE) =====
function claimDaily(member) {
  const db = loadDB();
  const user = getUser(db, member.id);

  checkReset(user);

  if (user.daily.claimed) {
    return { ok: false, reason: "claimed" };
  }

  if (user.daily.msgs < 50 || user.daily.vc < 1800) {
    return { ok: false, reason: "not_ready" };
  }

  user.daily.claimed = true;

  saveDB(db);

  return { ok: true };
}

// ===== EXPORT (🔥 TU BYŁ BŁĄD U CIEBIE PEWNIE)
module.exports = {
  addMessage,
  addVoiceTime,
  claimDaily
};
