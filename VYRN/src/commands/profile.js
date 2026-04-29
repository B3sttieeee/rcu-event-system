// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost");

function createProgressBar(percent) {
  const size = 10;
  const filledCount = Math.round((percent / 100) * size);
  // Używamy prestiżowych kwadratów VYRN
  const filled = "🟧".repeat(Math.max(0, filledCount));
  const empty = "⬛".repeat(Math.max(0, size - filledCount));
  return `${filled}${empty}`;
}

function formatVoiceTime(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return "**0**m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `**${hours}**h **${mins}**m` : `**${mins}**m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your official VYRN Clan profile and statistics"),

  async execute(interaction) {
    // Używamy deferReply, bo systemy plików mogą potrzebować milisekund na odpowiedź
    await interaction.deferReply();
    const userId = interaction.user.id;

    try {
      // Pobieranie danych - DODANE FALLBACKI (jeśli system zwróci undefined)
      const voiceMin = activity.getVoiceMinutes(userId) || 0;
      const levelData = activity.getLevelData(userId) || { level: 0, xp: 0, nextXP: 100 };
      const coins = economy.getCoins(userId) || 0;
      const currentBoost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(userId) : 1;
      
      const rank = activity.getRank(levelData.level) || { name: "Iron", emoji: "⚪", multiplier: 1 };
      const progress = Math.min(100, Math.floor((levelData.xp / (levelData.nextXP || 100)) * 100));

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
          `Member Status: **Active Member**\n\n` +
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
          `> XP Boost: ${currentBoost > 1 ? `**${currentBoost}x** ACTIVE` : "**1.0x (None)**"}\n` +
          `> Rank Bonus: **${rank.multiplier || 1}x**`
        )
        .setFooter({ 
          text: `VYRN HQ • Official Profile Data`, 
          iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("🔥 [PROFILE COMMAND ERROR]:", err);
      return await interaction.editReply({ 
        content: "❌ **Critical Error:** System failed to fetch your profile. Contact administration.", 
        ephemeral: true 
      });
    }
  }
};
