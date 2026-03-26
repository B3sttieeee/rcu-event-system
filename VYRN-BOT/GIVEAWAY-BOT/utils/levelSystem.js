const fs = require("fs");

// ===== DB =====
const DB_PATH = "/data/levels.json";

function loadDB() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data");
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== CONFIG =====
const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

const LEVEL_ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ===== XP =====
function neededXP(level) {
  return 50 + level * 25;
}

function getMultiplier(member) {
  if (!member) return 1;
  return member.roles.cache.has(BOOST_ROLE) ? BOOST_MULTIPLIER : 1;
}

// ===== BONUS DO GIVEAWAY =====
function getLevelBonus(member) {
  const db = loadDB();
  const user = db.xp[member.id];
  if (!user) return 0;

  return Math.floor(user.level / 5);
}

// ===== ROLE =====
async function checkLevelRoles(member, level) {
  for (const lvl in LEVEL_ROLES) {
    const roleId = LEVEL_ROLES[lvl];

    if (level >= lvl && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(()=>{});
    }
  }
}

// ===== ADD XP =====
async function addXP(member, amount) {
  const db = loadDB();

  if (!db.xp[member.id]) {
    db.xp[member.id] = { xp: 0, level: 0 };
  }

  db.xp[member.id].xp += amount;

  let leveledUp = false;

  while (
    db.xp[member.id].xp >=
    neededXP(db.xp[member.id].level)
  ) {
    db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
    db.xp[member.id].level++;
    leveledUp = true;
  }

  if (leveledUp) {
    await checkLevelRoles(member, db.xp[member.id].level);
  }

  saveDB(db);

  return {
    leveledUp,
    level: db.xp[member.id].level,
    xp: db.xp[member.id].xp
  };
}

// ===== VOICE XP =====
function startVoiceXP(client) {
  setInterval(() => {
    client.guilds.cache.forEach(guild => {
      guild.members.cache.forEach(member => {

        if (!member.voice.channel) return;
        if (member.voice.channel.members.size <= 1) return;
        if (member.voice.selfMute || member.voice.selfDeaf) return;

        addXP(member, 3);

      });
    });
  }, 60000);
}

module.exports = {
  addXP,
  getLevelBonus,
  startVoiceXP,
  getMultiplier
};
