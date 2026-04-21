const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadDB, loadConfig } = require("../../utils/levelSystem");
const { loadProfile } = require("../../utils/profileSystem");
const { getCurrentBoost } = require("../../utils/boostSystem");

// ====================== RANK SYSTEM ======================
function getRank(level) {
  if (level >= 75) return { name: "Legend",    emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby",      emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond",   emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum",  emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold",      emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5)  return { name: "Bronze",    emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

// ====================== PROGRESS BAR ======================
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

      const levels = loadDB();
      const profile = loadProfile();
      const config = loadConfig();

      const lvlData = levels.xp?.[userId] || { xp: 0, level: 0 };
      const userData = profile.users?.[userId] || { 
        voice: 0, 
        daily: { msgs: 0, vc: 0, streak: 0 } 
      };

      const needed = Math.floor(100 * Math.pow(lvlData.level + 1, 1.5));
      const progress = needed ? Math.min(100, Math.floor((lvlData.xp / needed) * 100)) : 0;
      const xpLeft = Math.max(0, needed - lvlData.xp);

      const totalVoiceMin = Math.floor((userData.voice || 0) / 60);
      const dailyVoiceMin = Math.floor((userData.daily.vc || 0) / 60);
      const dailyVoiceReq = 30 + ((userData.daily.streak || 0) * 5);

      const currentBoost = getCurrentBoost(userId);
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
          `> **${lvlData.xp} / ${needed} XP**\n` +
          `> ${createProgressBar(progress)} **${progress}%**\n` +
          `> **${xpLeft}** XP do następnego poziomu\n\n` +

          `**Voice Activity**\n` +
          `> Total: **${totalVoiceMin}** minut\n` +
          `> Daily: **${dailyVoiceMin} / ${dailyVoiceReq}** minut\n\n` +

          `**Daily Quest**\n` +
          `> Messages: **${userData.daily.msgs || 0}**\n` +
          `> Streak: **${userData.daily.streak || 0}** dni 🔥\n\n` +

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
