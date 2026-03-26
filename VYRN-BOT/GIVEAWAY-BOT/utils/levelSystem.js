const fs = require("fs");

// ===== PATH =====
const DB_PATH = "/data/levels.json";
const CONFIG_PATH = "/data/levelConfig.json";

// ===== INIT FOLDER =====
if (!fs.existsSync("/data")) {
  fs.mkdirSync("/data");
}

// ===== LOAD DB =====
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

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ===== LEVEL ROLES =====
const LEVEL_ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ===== BOOST =====
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// ===== HARD XP FORMULA =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== MULTIPLIER =====
function getMultiplier(member) {
  const cfg = loadConfig();

  let multi = cfg.globalMultiplier;

  if (member.roles.cache.has(BOOST_ROLE)) {
    multi *= BOOST_MULTIPLIER;
  }

  return multi;
}

// ===== ADD XP =====
async function addXP(member, baseAmount, messageLength = 0) {
  const db = loadDB();
  const cfg = loadConfig();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  let amount = baseAmount;

  // BONUS ZA DŁUGOŚĆ WIADOMOŚCI
  if (messageLength >= cfg.lengthThreshold) {
    amount = Math.floor(amount * (1 + cfg.lengthBonus));
  }

  // MULTIPLIER
  amount = Math.floor(amount * getMultiplier(member));

  db.xp[member.id].xp += amount;

  let leveledUp = false;

  while (db.xp[member.id].xp >= neededXP(db.xp[member.id].level)) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;
    leveledUp = true;
  }

  if (leveledUp) {
    await checkRoles(member, db.xp[member.id].level);
  }

  saveDB(db);

  return {
    leveledUp,
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp,
    gained: amount
  };
}

// ===== AUTO ROLE =====
async function checkRoles(member, level) {
  for (const lvl in LEVEL_ROLES) {
    const roleId = LEVEL_ROLES[lvl];

    if (level >= lvl && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(() => {});
    }
  }
}

// ===== VOICE XP =====
function startVoiceXP(client) {
  setInterval(() => {
    const cfg = loadConfig();

    client.guilds.cache.forEach(guild => {
      guild.members.cache.forEach(member => {

        if (!member.voice.channel) return;

        // ❌ ANTI AFK
        if (member.voice.channel.members.size <= 1) return;
        if (member.voice.selfMute || member.voice.selfDeaf) return;

        addXP(member, cfg.voiceXP);

      });
    });
  }, 60000); // co 1 min
}

// ===== CONFIG SETTERS =====
function setMessageXP(val) {
  const cfg = loadConfig();
  cfg.messageXP = val;
  saveConfig(cfg);
}

function setVoiceXP(val) {
  const cfg = loadConfig();
  cfg.voiceXP = val;
  saveConfig(cfg);
}

function setLengthBonus(val) {
  const cfg = loadConfig();
  cfg.lengthBonus = val;
  saveConfig(cfg);
}

function setGlobalMultiplier(val) {
  const cfg = loadConfig();
  cfg.globalMultiplier = val;
  saveConfig(cfg);
}

// ===== EXPORT =====
module.exports = {
  addXP,
  startVoiceXP,
  loadConfig,
  setMessageXP,
  setVoiceXP,
  setLengthBonus,
  setGlobalMultiplier
};
