const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";

const LEVEL_CHANNEL = "1475999590716018719";

// ===== DB =====
const DB_PATH = "./data.json";

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

// ===== XP =====
function neededXP(level) {
  return 50 + level * 25;
}

// ===== EVENT =====
module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (message.author.bot) return;

    const db = loadDB();

    // ===== INIT USER =====
    if (!db.xp[message.author.id]) {
      db.xp[message.author.id] = { xp: 0, level: 0 };
    }

    // ===== ADD XP =====
    db.xp[message.author.id].xp += 5;

    let leveledUp = false;

    while (
      db.xp[message.author.id].xp >=
      neededXP(db.xp[message.author.id].level)
    ) {
      db.xp[message.author.id].xp -= neededXP(db.xp[message.author.id].level);
      db.xp[message.author.id].level++;
      leveledUp = true;
    }

    saveDB(db);

    // ===== LEVEL UP EMBED =====
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
            `🎉 **Congratulations!**\n\n` +
            `🏆 You reached **Level ${db.xp[message.author.id].level}**\n\n` +
            `🚀 Keep chatting!`
          )
          .setThumbnail(message.author.displayAvatarURL());

        channel.send({ embeds: [embed] });
      }
    }

    // ===== PREFIX COMMANDS =====
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const userData = db.xp[message.author.id];

    // ===== RANK =====
    if (cmd === "rank" || cmd === "r") {
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setAuthor({
          name: `${message.author.username} • Profile`,
          iconURL: message.author.displayAvatarURL()
        })
        .setDescription(
          `🏆 **Level:** ${userData.level}\n` +
          `⭐ **XP:** ${userData.xp}/${neededXP(userData.level)}`
        )
        .setThumbnail(message.author.displayAvatarURL());

      return message.reply({ embeds: [embed] });
    }

    // ===== TOP =====
    if (cmd === "top") {
      const sorted = Object.entries(db.xp)
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 10);

      const leaderboard = sorted
        .map(
          (u, i) =>
            `**#${i + 1}** <@${u[0]}> • Level ${u[1].level}`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#6366f1")
        .setTitle("🏆 Leaderboard")
        .setDescription(leaderboard || "No data");

      return message.reply({ embeds: [embed] });
    }
  }
};
