// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Świeże importy za każdym razem
const { loadDB, neededXP, getRank } = require("../systems/level");
const { getVoiceMinutes } = require("../systems/profile");
const { getCoins } = require("../systems/economy");
const { getCurrentBoost } = require("../systems/boost");

function createProgressBar(percent) {
  const size = 12;
  const filled = Math.round((percent / 100) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Twój profil"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;

      // Zawsze świeże dane
      const levelsDB = loadDB();
      const lvlData = levelsDB.users?.[userId] || levelsDB.xp?.[userId] || { xp: 0, level: 0 };

      const voiceMin = getVoiceMinutes(userId);
      const coins = getCoins(userId);
      const boost = getCurrentBoost(userId) || 1;

      const nextXP = neededXP(lvlData.level);
      const progress = nextXP > 0 ? Math.min(100, Math.floor((lvlData.xp / nextXP) * 100)) : 0;

      const rank = getRank(lvlData.level);

      const embed = new EmbedBuilder()
        .setColor("#0b0b0f")
        .setAuthor({
          name: `${interaction.user.username} • VYRN Profile`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**${rank.emoji} ${rank.name}** — Level **${lvlData.level}**\n\n` +
          `**Experience**\n` +
          `> \`${lvlData.xp} / ${nextXP} XP\`\n` +
          `> ${createProgressBar(progress)} **${progress}%**\n\n` +
          `**Voice Activity**\n` +
          `> **${voiceMin}** minut\n\n` +
          `**Economy**\n` +
          `> **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +
          `**Boost**\n` +
          `> ${boost > 1 ? `**${boost}x**` : "Brak"}`
        )
        .setFooter({ text: "VYRN Clan", iconURL: interaction.guild?.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[PROFILE ERROR]", err);
      await interaction.editReply({ content: "❌ Błąd ładowania profilu.", ephemeral: true });
    }
  }
};
