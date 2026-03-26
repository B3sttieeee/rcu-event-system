const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";
const LEVEL_CHANNEL = "1475999590716018719";

const BOOST_ROLE = "1476000398107217980";
const BOOST_MULTIPLIER = 1.75;

// 🎖 ROLE ZA LEVEL
const LEVEL_ROLES = {
  1: "1476000458987278397",
  15: "1476000995501670534",
  30: "1476000459595448442",
  45: "1476000991206707221",
  60: "1476000991823532032",
  75: "1476000992351879229"
};

// ===== DB (RAILWAY) =====
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

// ===== XP =====
function neededXP(level) {
  return 50 + level * 25;
}

function getMultiplier(member) {
  if (!member) return 1;
  return member.roles.cache.has(BOOST_ROLE) ? BOOST_MULTIPLIER : 1;
}

// ===== LEVEL BONUS (DO GIVEAWAY) =====
function calcLevelBonus(level) {
  return Math.floor(level / 5);
}

module.exports.getLevelBonus = (member) => {
  const db = loadDB();
  const user = db.xp[member.id];
  if (!user) return 0;
  return calcLevelBonus(user.level);
};

// ===== AUTO ROLE =====
async function checkLevelRoles(member, level) {
  for (const lvl in LEVEL_ROLES) {
    const roleId = LEVEL_ROLES[lvl];

    if (level >= lvl && !member.roles.cache.has(roleId)) {
      await member.roles.add(roleId).catch(()=>{});
    }
  }
}

// ===== MESSAGE XP =====
module.exports.name = "messageCreate";

module.exports.execute = async (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  const db = loadDB();

  if (!db.xp[message.author.id]) {
    db.xp[message.author.id] = { xp: 0, level: 0 };
  }

  const member = message.member;

  // XP
  const gained = Math.floor(5 * getMultiplier(member));
  db.xp[message.author.id].xp += gained;

  let leveledUp = false;

  while (
    db.xp[message.author.id].xp >=
    neededXP(db.xp[message.author.id].level)
  ) {
    db.xp[message.author.id].xp -= neededXP(db.xp[message.author.id].level);
    db.xp[message.author.id].level++;
    leveledUp = true;
  }

  // AUTO ROLE
  if (leveledUp) {
    await checkLevelRoles(member, db.xp[message.author.id].level);
  }

  saveDB(db);

  // EMBED
  if (leveledUp) {
    const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor("#facc15")
        .setAuthor({
          name: `${message.author.username} • Level Up`,
          iconURL: message.author.displayAvatarURL()
        })
        .setDescription(
          `🏆 **New Level Achieved!**\n\n` +
          `🎯 Level: **${db.xp[message.author.id].level}**`
        )
        .setThumbnail(message.author.displayAvatarURL());

      channel.send({
        content: `🎉 ${message.author}`,
        embeds: [embed]
      });
    }
  }

  // ===== COMMANDS =====
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const data = db.xp[message.author.id];

  // RANK
  if (cmd === "rank" || cmd === "r") {
    const needed = neededXP(data.level);

    const embed = new EmbedBuilder()
      .setColor("#111111")
      .setAuthor({
        name: `${message.author.username}`,
        iconURL: message.author.displayAvatarURL()
      })
      .setDescription(
        `🏆 Level: **${data.level}**\n` +
        `XP: **${data.xp}/${needed}**`
      );

    return message.reply({ embeds: [embed] });
  }

  // TOP
  if (cmd === "top") {
    const sorted = Object.entries(db.xp)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10);

    const leaderboard = sorted
      .map((u, i) => `**#${i + 1}** <@${u[0]}> • ${u[1].level}`)
      .join("\n");

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#6366f1")
          .setTitle("🏆 Leaderboard")
          .setDescription(leaderboard || "Brak danych")
      ]
    });
  }
};

// ===== VOICE XP (ANTI AFK) =====
module.exports.startVoiceXP = (client) => {

  setInterval(() => {

    client.guilds.cache.forEach(guild => {

      guild.members.cache.forEach(member => {

        if (!member.voice.channel) return;

        // ❌ sam na vc
        if (member.voice.channel.members.size <= 1) return;

        // ❌ mute/deaf
        if (member.voice.selfMute || member.voice.selfDeaf) return;

        const db = loadDB();

        if (!db.xp[member.id]) {
          db.xp[member.id] = { xp: 0, level: 0 };
        }

        db.xp[member.id].xp += 3;

        while (
          db.xp[member.id].xp >=
          neededXP(db.xp[member.id].level)
        ) {
          db.xp[member.id].xp -= neededXP(db.xp[member.id].level);
          db.xp[member.id].level++;

          checkLevelRoles(member, db.xp[member.id].level);
        }

        saveDB(db);

      });

    });

  }, 60000); // co 1 min
};
      return message.reply({ embeds: [embed] });
    }
  }
};
