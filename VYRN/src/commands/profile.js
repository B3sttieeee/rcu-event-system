// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost");

// Funkcja paska postępu w stylu VYRN
function createProgressBar(percent) {
  const size = 10;
  const filledCount = Math.round((percent / 100) * size);
  // Wykorzystujemy znaki o stałej szerokości dla lepszego wyglądu
  const filled = "🟧".repeat(Math.max(0, filledCount));
  const empty = "⬛".repeat(Math.max(0, size - filledCount));
  return `${filled}${empty}`;
}

// Pomocnicza funkcja do formatowania czasu głosowego
function formatVoiceTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `**${hours}**h **${mins}**m`;
  return `**${mins}**m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your official VYRN Clan profile and statistics"),

  async execute(interaction) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    try {
      // Pobieranie danych z systemów
      const voiceMin = activity.getVoiceMinutes(userId);
      const levelData = activity.getLevelData(userId);
      const coins = economy.getCoins(userId);
      const boost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(userId) : 1;
      
      // Obliczanie rangi i postępu
      const rank = activity.getRank(levelData.level);
      const progress = Math.min(100, Math.floor((levelData.xp / levelData.nextXP) * 100));

      const embed = new EmbedBuilder()
        .setColor("#FFD700") // VYRN Gold
        .setAuthor({ 
          name: `VYRN HQ • MEMBER PROFILE`, 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTitle(`${rank.emoji} ${interaction.user.username}`)
        .setDescription(
          `Current Rank: **${rank.name}**\n` +
          `Member Status: **Active**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          
          `🏆 **CLAN PROGRESSION**\n` +
          `> **Level:** \`${levelData.level}\`\n` +
          `> **Experience:** \`${levelData.xp.toLocaleString()} / ${levelData.nextXP.toLocaleString()} XP\`\n` +
          `> ${createProgressBar(progress)} **${progress}%**\n\n` +
          
          `🎤 **VOICE ACTIVITY**\n` +
          `> Time Spent: ${formatVoiceTime(voiceMin)}\n\n` +
          
          `💰 **VAULT BALANCE**\n` +
          `> **${economy.formatCoins(coins)}** <:CASHH:1491180511308157041>\n\n` +
          
          `🚀 **ACTIVE MULTIPLIERS**\n` +
          `> XP Boost: ${boost > 1 ? `**${boost}x** ACTIVE` : "**1.0x (Standard)**"}\n` +
          `> Rank Multiplier: **${rank.multiplier || 1}x**`
        )
        .setFooter({ 
          text: `VYRN CLAN • ID: ${interaction.user.id}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("🔥 [PROFILE ERROR]", err);
      await interaction.editReply({ 
        content: "❌ **Error:** Failed to load profile data. Please try again later.", 
        ephemeral: true 
      });
    }
  }
};
