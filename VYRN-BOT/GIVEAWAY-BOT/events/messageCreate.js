const fs = require("fs");

const DB_PATH = "./data.json";

const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

const LEVEL_CHANNEL = "1475999590716018719";

const LEVEL_ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442"
};

const cooldown = new Set();

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH));
  } catch {
    return { xp: {}, messages: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function neededXP(level) {
  return 50 + level * 25;
}

module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (message.author.bot) return;

    // ===== COOLDOWN =====
    if (cooldown.has(message.author.id)) return;
    cooldown.add(message.author.id);
    setTimeout(() => cooldown.delete(message.author.id), 5000);

    const db = loadDB();

    if (!db.xp[message.author.id]) {
      db.xp[message.author.id] = { xp: 0, level: 0 };
    }

    const member = message.member;

    let multiplier = member.roles.cache.has(BOOST_ROLE)
      ? BOOST_MULTIPLIER
      : 1;

    db.xp[message.author.id].xp += Math.floor(5 * multiplier);

    while (
      db.xp[message.author.id].xp >=
      neededXP(db.xp[message.author.id].level)
    ) {
      db.xp[message.author.id].xp -= neededXP(
        db.xp[message.author.id].level
      );

      db.xp[message.author.id].level++;

      const level = db.xp[message.author.id].level;

      const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);

      if (channel) {
        channel.send(`🎉 ${message.author} wbił level ${level}!`);
      }

      const roleId = LEVEL_ROLES[level];
      if (roleId) {
        const role = message.guild.roles.cache.get(roleId);
        if (role) member.roles.add(role).catch(() => {});
      }
    }

    saveDB(db);
  }
};
