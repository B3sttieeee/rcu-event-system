const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// ===== PATH =====
const DATA_DIR = path.join(__dirname, "../data");
const LEVEL_DB = path.join(DATA_DIR, "levels.json");
const PROFILE_DB = path.join(DATA_DIR, "profile.json");

// ===== INIT =====
function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({ xp: {} }, null, 2));
  }

  if (!fs.existsSync(PROFILE_DB)) {
    fs.writeFileSync(PROFILE_DB, JSON.stringify({ users: {} }, null, 2));
  }
}

// ===== LOAD =====
function loadLevels() {
  ensureFiles();
  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

function loadProfile() {
  ensureFiles();
  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level + 1, 1.5)); // 🔥 FIX
}

// ===== BAR =====
function createBar(current, needed) {
  if (needed <= 0) return { bar: "⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛", percent: 0 };

  const percent = Math.min(100, Math.floor((current / needed) * 100));
  const filled = Math.round(percent / 10);

  let bar = "";

  for (let i = 0; i < 10; i++) {
    if (i < filled) {
      if (percent < 25) bar += "🟥";
      else if (percent < 50) bar += "🟧";
      else if (percent < 75) bar += "🟨";
      else bar += "🟩";
    } else {
      bar += "⬛";
    }
  }

  return { bar, percent };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Show your profile"),

  async execute(interaction) {

    try {

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

      let status = "🔴 Low Progress";
      if (percent >= 40) status = "🟡 Medium Progress";
      if (percent >= 75) status = "🟢 High Progress";

      const embed = new EmbedBuilder()
        .setColor("#0f172a")
        .setAuthor({
          name: `${interaction.user.username} • PROFILE`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
        .addFields(
          { name: "🏆 LEVEL", value: `\`${lvlData.level}\``, inline: true },
          { name: "📊 XP", value: `\`${lvlData.xp} / ${needed}\`\n${bar} **${percent}%**`, inline: true },
          { name: "⚡ STATUS", value: status, inline: true },
          { name: " ", value: "✨ **ACTIVITY & DAILY PROGRESS**", inline: false },
          { name: "🎤 Voice Time", value: `\`${vcMinutes} min\``, inline: true },
          { name: "💬 Messages", value: `\`${user.daily.msgs} / 50\``, inline: true },
          { name: "🎯 Daily Voice", value: `\`${Math.floor(user.daily.vc / 60)} / 30 min\``, inline: true }
        )
        .setFooter({
          text: "VYRN System • Profile",
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.log("❌ PROFILE ERROR:", err);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ Profile error" });
      } else {
        await interaction.reply({ content: "❌ Profile error", ephemeral: true });
      }
    }
  }
};
