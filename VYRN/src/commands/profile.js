// src/commands/profile.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const activity = require("../systems/activity");
const economy = require("../systems/economy");
const boostSystem = require("../systems/boost");

// --- KONFIGURACJA KOMENDY ---
const CONFIG = {
  COLOR: "#FFD700", // VYRN Gold
  CURRENCY_EMOJI: "<:CASHH:1491180511308157041>",
  PROGRESS_SIZE: 10,
  PROGRESS_FULL: "🟧",
  PROGRESS_EMPTY: "⬛"
};

// --- FUNKCJE POMOCNICZE ---
/**
 * Generuje wizualny pasek postępu
 * @param {number} percent - Procent ukończenia (0-100)
 * @returns {string} Wygenerowany pasek z emoji
 */
function createProgressBar(percent) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const filledCount = Math.round((safePercent / 100) * CONFIG.PROGRESS_SIZE);
  
  const filled = CONFIG.PROGRESS_FULL.repeat(Math.max(0, filledCount));
  const empty = CONFIG.PROGRESS_EMPTY.repeat(Math.max(0, CONFIG.PROGRESS_SIZE - filledCount));
  
  return `${filled}${empty}`;
}

/**
 * Formatuje minuty na czytelny format czasu (np. 1h 45m)
 * @param {number} totalMinutes 
 * @returns {string}
 */
function formatVoiceTime(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return "**0**m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `**${hours}**h **${mins}**m` : `**${mins}**m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 View your or another member's official VYRN Clan profile")
    .addUserOption(option => 
      option.setName("target")
        .setDescription("The member whose profile you want to view")
        .setRequired(false)
    ),

  /**
   * Wykonuje komendę /profile
   * @param {import('discord.js').CommandInteraction} interaction 
   */
  async execute(interaction) {
    // Rejestrujemy zapytanie do API Discorda, dając bazie danych czas na odpowiedź
    await interaction.deferReply();

    try {
      // 1. Identyfikacja celu
      const targetUser = interaction.options.getUser("target") || interaction.user;
      const targetId = targetUser.id;

      // 2. Pobieranie danych z fallbackami na wypadek braku wpisów w systemie
      const voiceMin = activity.getVoiceMinutes(targetId) || 0;
      const levelData = activity.getLevelData(targetId) || { level: 0, xp: 0, nextXP: 100 };
      const coins = economy.getCoins(targetId) || 0;
      const currentBoost = boostSystem?.getCurrentBoost ? boostSystem.getCurrentBoost(targetId) : 1;
      
      const rank = activity.getRank(levelData.level) || { name: "Unranked", emoji: "🔰", multiplier: 1 };
      
      // 3. Obliczenia i matematyka
      const nextXP = levelData.nextXP || 100; // Zabezpieczenie przed dzieleniem przez 0
      const progress = Math.min(100, Math.floor((levelData.xp / nextXP) * 100));
      const totalEffectiveMultiplier = (currentBoost * (rank.multiplier || 1)).toFixed(1);

      // 4. Budowanie interfejsu (Embed)
      const embed = new EmbedBuilder()
        .setColor(CONFIG.COLOR)
        .setAuthor({ 
          name: "VYRN HQ • MEMBER DOSSIER", 
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined 
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setTitle(`${rank.emoji} ${targetUser.username}'s Profile`)
        .setDescription(`**Member Status:** Secure & Active ✅\nBelow is the official clan progression and statistical data.`)
        .addFields(
          {
            name: "🏆 Clan Progression",
            value: `> **Level:** \`${levelData.level}\`\n> **Rank:** ${rank.emoji} \`${rank.name}\`\n> **Experience:** \`${levelData.xp.toLocaleString()} / ${nextXP.toLocaleString()} XP\`\n> ${createProgressBar(progress)} **${progress}%**`,
            inline: false
          },
          {
            name: "🎤 Voice Activity",
            value: `> **${formatVoiceTime(voiceMin)}** recorded.`,
            inline: true
          },
          {
            name: "💰 Vault Balance",
            value: `> **${economy.formatCoins(coins)}** ${CONFIG.CURRENCY_EMOJI}`,
            inline: true
          },
          {
            name: "🚀 Active Multipliers",
            value: `> System Boost: ${currentBoost > 1 ? `**${currentBoost}x** (Active)` : "`None`"}\n> Rank Bonus: **${rank.multiplier || 1}x**\n> 📊 **Total Rate: ${totalEffectiveMultiplier}x**`,
            inline: false
          }
        )
        .setFooter({ 
          text: `Inquiry by ${interaction.user.tag} • VYRN System`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      // 5. Edytowanie początkowej odpowiedzi
      return await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("🔥 [PROFILE COMMAND ERROR]:", err);
      
      // WAŻNE: Jeśli użyliśmy deferReply() (domyślnie non-ephemeral), nie możemy nagle zrobić z tego editReply() z flagą ephemeral. 
      // To ograniczenie API Discorda, dlatego wysyłamy zwykły, tekstowy błąd.
      return await interaction.editReply({ 
        content: "❌ **Critical Error:** System failed to fetch the profile. Please contact administration." 
      });
    }
  }
};
