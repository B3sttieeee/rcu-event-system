const { EmbedBuilder } = require("discord.js");
const { addXP, getMultiplier } = require("../utils/levelSystem");
const fs = require("fs");

// ===== CONFIG =====
const PREFIX = ".";
const LEVEL_CHANNEL = "1475999590716018719";
const DB_PATH = "/data/levels.json";

// ===== LOAD DB =====
function loadDB() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data");
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_PATH));
}

function neededXP(level) {
  return 50 + level * 25;
}

// ===== EVENT =====
module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const gained = Math.floor(5 * getMultiplier(message.member));
    const result = await addXP(message.member, gained);

    // ===== LEVEL UP =====
    if (result.leveledUp) {
      const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor("#facc15")
          .setAuthor({
            name: `${message.author.username} • Level Up`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(`🎯 Level: **${result.level}**`)
          .setThumbnail(message.author.displayAvatarURL());

        channel.send({
          content: `🎉 ${message.author}`,
          embeds: [embed]
        });
      }
    }

    // ===== PREFIX COMMANDS =====
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const db = loadDB();
    const data = db.xp[message.author.id];

    if (!data) return;

    // ===== RANK =====
    if (cmd === "rank" || cmd === "r") {
      const needed = neededXP(data.level);

      const embed = new EmbedBuilder()
        .setColor("#111111")
        .setAuthor({
          name: `${message.author.username} • Profile`,
          iconURL: message.author.displayAvatarURL()
        })
        .setThumbnail(message.author.displayAvatarURL())
        .setDescription(
          `🏆 **Level Information**\n` +
          `▶ Level: **${data.level}**\n` +
          `▶ XP: **${data.xp}/${needed}**`
        )
        .setFooter({ text: "VYRN System" });

      return message.reply({ embeds: [embed] });
    }

    // ===== TOP =====
    if (cmd === "top") {
      const sorted = Object.entries(db.xp)
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 10);

      const leaderboard = sorted
        .map((u, i) => `**#${i + 1}** <@${u[0]}> • Level ${u[1].level}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#6366f1")
        .setTitle("🏆 Leaderboard")
        .setDescription(leaderboard || "Brak danych");

      return message.reply({ embeds: [embed] });
    }
  }
};
