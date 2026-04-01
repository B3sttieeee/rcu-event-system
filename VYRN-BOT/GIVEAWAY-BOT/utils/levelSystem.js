const fs = require("fs");

const DATA_DIR = "/data";
const DB_PATH = `${DATA_DIR}/levels.json`;
const CONFIG_PATH = `${DATA_DIR}/levelConfig.json`;

// ===== INIT =====
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ===== DB =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== CONFIG =====
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      messageXP: 3,
      voiceXP: 5,
      lengthBonus: 0.3,
      lengthThreshold: 30,
      globalMultiplier: 1
    }, null, 2));
  }

  return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

// ===== XP =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function addXP(member, baseAmount, messageLength = 0) {
  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  let amount = baseAmount;

  if (messageLength >= cfg.lengthThreshold) {
    amount = Math.floor(amount * (1 + cfg.lengthBonus));
  }

  db.xp[member.id].xp += amount;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;
  }

  saveDB(db);

  return {
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp,
    gained: amount
  };
}

// ===== VOICE XP =====
function startVoiceXP(client) {
  setInterval(() => {
    const cfg = loadConfig();

    client.guilds.cache.forEach(guild => {
      guild.members.cache.forEach(member => {

        if (!member.voice.channel) return;

        // ❌ sam na vc = brak xp
        if (member.voice.channel.members.size <= 1) return;

        addXP(member, cfg.voiceXP);

        console.log(`[VC XP] ${member.user.username} +${cfg.voiceXP}`);
      });
    });

  }, 60000);
}

// ===== EXPORT =====
module.exports = {
  addXP,
  startVoiceXP,
  loadConfig
};
