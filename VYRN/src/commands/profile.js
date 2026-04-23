// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Importy z systemów
const { loadDB, neededXP, getRank } = require("../systems/level");
const { loadProfile, getVoiceMinutes } = require("../systems/profile");
const { getCurrentBoost } = require("../systems/boost");
const { getCoins } = require("../systems/economy");

function createProgressBar(percent) {
  const size = 12;
  const filled = Math.round((percent / 100) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Wyświetla Twój szczegółowy profil w VYRN"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;

      // Ładowanie danych z systemów
      const levelsDB = loadDB();
      const profileDB = loadProfile();
      
      const lvlData = levelsDB.xp?.[userId] || { xp: 0, level: 0 };
      const totalVoiceMin = getVoiceMinutes(userId);
      const currentBoost = getCurrentBoost(userId) || 1;
      const coins = getCoins(userId);

      // Obliczenia poziomu
      const nextLevelXP = neededXP(lvlData.level);
      const progress = nextLevelXP > 0 
        ? Math.min(100, Math.floor((lvlData.xp / nextLevelXP) * 100)) 
        : 0;
      const xpLeft = Math.max(0, nextLevelXP - lvlData.xp);

      const rank = getRank(lvlData.level);

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a")
        .setAuthor({
          name: `${interaction.user.username} • VYRN Profile`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**${rank.emoji} ${rank.name}** — Level **${lvlData.level}**\n\n` +

          `**Experience**\n` +
          `> **${lvlData.xp} / ${nextLevelXP} XP**\n` +
          `> ${createProgressBar(progress)} **${progress}%**\n` +
          `> **${xpLeft}** XP do następnego poziomu\n\n` +

          `**Voice Activity**\n` +
          `> Total: **${totalVoiceMin}** minut\n\n` +

          `**Economy**\n` +
          `> Monety: **${coins.toLocaleString("pl-PL")}** <:CASHH:1491180511308157041>\n\n` +

          `**Active Boost**\n` +
          `> ${currentBoost > 1 ? `**${currentBoost}x XP** 🚀` : "**Brak**"}`
        )
        .setFooter({
          text: "VYRN CLAN • Grind smarter, not harder",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Błąd w komendzie /profile:", err);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas ładowania profilu.",
        ephemeral: true
      });
    }
  }
};
