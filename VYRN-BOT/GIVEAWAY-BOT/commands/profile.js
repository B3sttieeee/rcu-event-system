const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== PATH =====
const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== LOAD =====
function loadLevels() {
  if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({ xp: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

function loadProfile() {
  if (!fs.existsSync(PROFILE_DB)) {
    fs.writeFileSync(PROFILE_DB, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP FORMULA =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== PROGRESS BAR =====
function createBar(current, needed) {
  const percent = Math.floor((current / needed) * 100);
  const filled = Math.round(percent / 10);

  const bar =
    "🟩".repeat(filled) +
    "⬛".repeat(10 - filled);

  return { bar, percent };
}

module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (!message.content.startsWith(".")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd !== "profile" && cmd !== "p") return;

    // ===== LOAD DATA =====
    const levels = loadLevels();
    const profile = loadProfile();

    const lvlData = levels.xp[message.author.id] || { xp: 0, level: 0 };

    const user = profile.users?.[message.author.id] || {
      voice: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const needed = neededXP(lvlData.level);
    const { bar, percent } = createBar(lvlData.xp, needed);

    const vcMinutes = Math.floor(user.voice / 60);

    // ===== EMBED =====
    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: `${message.author.username} • PROFILE`,
        iconURL: message.author.displayAvatarURL()
      })
      .setThumbnail(message.author.displayAvatarURL({ size: 512 }))
      .setDescription(
        `🏆 **LEVEL SYSTEM**\n` +
        `> **Level:** \`${lvlData.level}\`\n` +
        `> **XP:** \`${lvlData.xp} / ${needed}\`\n` +
        `> ${bar} **${percent}%**\n\n` +

        `🎤 **VOICE ACTIVITY**\n` +
        `> ⏱️ **Time:** \`${vcMinutes} min\`\n\n` +

        `🎯 **DAILY PROGRESS**\n` +
        `> 💬 Messages: \`${user.daily.msgs} / 50\`\n` +
        `> 🎤 VC Time: \`${Math.floor(user.daily.vc / 60)} / 30 min\`\n\n` +

        `🚀 **TIP:** Longer messages = more XP!`
      )
      .setFooter({
        text: "VYRN System • Advanced Profile",
        iconURL: message.client.user.displayAvatarURL()
      });

    return message.reply({ embeds: [embed] });
  }
};
