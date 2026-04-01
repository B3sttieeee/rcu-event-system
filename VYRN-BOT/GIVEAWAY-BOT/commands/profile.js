const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== LOAD LEVELS
function loadLevels() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
  }

  if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({ xp: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

// ===== LOAD PROFILE
function loadProfile() {
  if (!fs.existsSync(PROFILE_DB)) {
    fs.writeFileSync(PROFILE_DB, JSON.stringify({ users: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== BAR
function createBar(current, needed) {
  const percent = Math.floor((current / needed) * 100);
  const filled = Math.round(percent / 10);

  let bar = "";

  for (let i = 0; i < 10; i++) {
    bar += i < filled ? "🟩" : "⬛";
  }

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
      .addFields(
        {
          name: "🏆 LEVEL",
          value: `\`${lvlData.level}\``,
          inline: true
        },
        {
          name: "📊 XP",
          value: `\`${lvlData.xp} / ${needed}\`\n${bar} ${percent}%`,
          inline: true
        },
        {
          name: "🎤 Voice Time",
          value: `\`${vcMinutes} min\``,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
