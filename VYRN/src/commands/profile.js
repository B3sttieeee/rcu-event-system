const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// ====================== SAFE IMPORTS ======================
const levelSystem = require("../systems/level");

const neededXP =
  typeof levelSystem.neededXP === "function"
    ? levelSystem.neededXP
    : () => 100;

const getRank =
  typeof levelSystem.getRank === "function"
    ? levelSystem.getRank
    : () => ({ name: "Unknown", emoji: "❔" });

const loadLevelDB =
  typeof levelSystem.loadDB === "function"
    ? levelSystem.loadDB
    : () => ({ xp: {} });

const { getCoins } = require("../systems/economy");
const { getVoiceMinutes } = require("../systems/profile");
const { getCurrentBoost } = require("../systems/boost");

// ====================== UI ======================
function bar(percent) {
  const safe = Math.max(0, Math.min(100, percent));
  const filled = Math.round(safe / 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
}

// ====================== COMMAND ======================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your profile"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const db = loadLevelDB();
      const u = db?.xp?.[interaction.user.id] || { xp: 0, level: 0 };

      const coins = getCoins(interaction.user.id);
      const voice = getVoiceMinutes(interaction.user.id);
      const boost = getCurrentBoost(interaction.user.id) || 1;

      const rank = getRank(u.level);

      const next = neededXP(u.level) || 1;
      const percent = Math.min(100, Math.floor((u.xp / next) * 100));

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setAuthor({
          name: `${interaction.user.username} • Profile`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(
          `> **RANK INFORMATION**\n` +
            `> ${rank.emoji} **${rank.name}**\n` +
            `> Level: **${u.level}**\n\n` +

            `> **EXPERIENCE**\n` +
            `> XP: \`${u.xp}/${next}\`\n` +
            `> Progress: **${percent}%**\n` +
            `> ${bar(percent)}\n\n` +

            `> **ECONOMY**\n` +
            `> Coins: \`${coins.toLocaleString("pl-PL")}\`\n` +
            `> Boost: \`${boost > 1 ? boost + "x" : "none"}\`\n\n` +

            `> **ACTIVITY**\n` +
            `> Voice time: \`${voice} min\`\n`
        )
        .setFooter({
          text: "VYRN • Black Profile System",
          iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("[PROFILE ERROR]", err);

      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Error loading profile.",
          ephemeral: true
        });
      }
    }
  }
};
