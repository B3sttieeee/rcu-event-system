const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadDB, loadConfig } = require("../../utils/levelSystem");
const { loadProfile } = require("../../utils/profileSystem");
const { getCurrentBoost } = require("../../utils/boostSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Wyświetla Twój szczegółowy profil w VYRN"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      const member = interaction.member;

      const levels = loadDB();
      const profile = loadProfile();
      const config = loadConfig();

      const lvlData = levels.xp?.[userId] || { xp: 0, level: 0 };
      const userData = profile.users?.[userId] || { 
        voice: 0, 
        daily: { msgs: 0, vc: 0, streak: 0 } 
      };

      const neededXP = Math.floor(100 * Math.pow(lvlData.level, 1.5));
      const progress = neededXP > 0 ? Math.min(100, Math.floor((lvlData.xp / neededXP) * 100)) : 0;
      const xpLeft = Math.max(0, neededXP - lvlData.xp);

      const totalVoiceMinutes = Math.floor((userData.voice || 0) / 60);
      const dailyVoiceMinutes = Math.floor((userData.daily.vc || 0) / 60);
      const dailyVoiceRequired = 30 + ((userData.daily.streak || 0) * 5);

      const currentBoost = getCurrentBoost(userId);
      const rank = getRank(lvlData.level);

      const embed = new EmbedBuilder()
        .setColor("#0f172a")
        .setAuthor({
          name: `${interaction.user.username} • Profil`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `🏆 **${rank.emoji} ${rank.name} • Level ${lvlData.level}**\n` +
          `<a:XP:1488763317857161377> **${lvlData.xp} / ${neededXP} XP**\n` +
          `${createProgressBar(progress)} \`${progress}%\`\n` +
          `<:Next:1488760924193161337> Do następnego poziomu: **${xpLeft} XP**\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `<a:TimeS:1488760889560797314> **Czas na VC:** ${totalVoiceMinutes} minut\n` +
          `<:Messages:1488763434966192242> **Wiadomości dziś:** ${userData.daily.msgs || 0}\n` +
          `<:Zadania:1488763408026435594> **Daily VC:** ${dailyVoiceMinutes} / ${dailyVoiceRequired} min\n` +
          `🔥 **Daily Streak:** ${userData.daily.streak || 0} dni\n` +
          `⚡ **Aktywny Boost:** ${currentBoost > 1 ? `**${currentBoost}x XP**` : "Brak"}\n` +
          `🌍 **Global Multiplier:** \`${config.globalMultiplier || 1}x\``
        )
        .setFooter({ text: "VYRN Clan • Keep grinding! 🔥" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Błąd w /profile:", err);
      await interaction.editReply({ 
        content: "❌ Wystąpił błąd podczas ładowania profilu.", 
        ephemeral: true 
      });
    }
  }
};

// ====================== POMOCNICZE FUNKCJE ======================
function getRank(level) {
  if (level >= 75) return { name: "Legend", emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby", emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum", emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold", emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5)  return { name: "Bronze", emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

function createProgressBar(percent) {
  const filled = Math.round(percent / 10);
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
}
