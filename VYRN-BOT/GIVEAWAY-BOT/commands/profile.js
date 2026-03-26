const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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

// ===== XP =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function createBar(current, needed) {
  const percent = Math.floor((current / needed) * 100);
  const filled = Math.round(percent / 10);

  const bar = "🟩".repeat(filled) + "⬛".repeat(10 - filled);

  return { bar, percent };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Show your profile"),

  async execute(interaction) {

    const levels = loadLevels();
    const profile = loadProfile();

    const lvlData = levels.xp[interaction.user.id] || { xp: 0, level: 0 };

    const user = profile.users?.[interaction.user.id] || {
      voice: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const needed = neededXP(lvlData.level);
    const { bar, percent } = createBar(lvlData.xp, needed);

    const vcMinutes = Math.floor(user.voice / 60);

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: `${interaction.user.username} • PROFILE`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(
        `🏆 **LEVEL ${lvlData.level}**\n` +
        `${bar} ${percent}%\n` +
        `XP: ${lvlData.xp}/${needed}\n\n` +

        `🎤 Voice: ${vcMinutes} min\n\n` +

        `🎯 Daily:\n` +
        `💬 ${user.daily.msgs}/50\n` +
        `🎤 ${Math.floor(user.daily.vc / 60)}/30 min`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
