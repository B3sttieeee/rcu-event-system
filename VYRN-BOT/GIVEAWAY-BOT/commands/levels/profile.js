const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { loadDB, loadConfig, neededXP } = require("../../utils/levelSystem");
const { loadProfile } = require("../../utils/profileSystem");
const { getCurrentBoost } = require("../../utils/boostSystem");
const { getCoins } = require("../../utils/economySystem");

function getRank(level) {
  if (level >= 75) return { name: "Legend",    emoji: "<:LegeRank:1488756343190847538>" };
  if (level >= 60) return { name: "Ruby",      emoji: "<:RubyRank:1488756400514404372>" };
  if (level >= 45) return { name: "Diamond",   emoji: "<:DiaxRank:1488756482924089404>" };
  if (level >= 30) return { name: "Platinum",  emoji: "<:PlatRank:1488756557863845958>" };
  if (level >= 15) return { name: "Gold",      emoji: "<:GoldRank:1488756524854808686>" };
  if (level >= 5)  return { name: "Bronze",    emoji: "<:BronzeRank:1488756638285565962>" };
  return { name: "Iron", emoji: "<:Ironrank:1488756604277887039>" };
}

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

      // Poprawne ładowanie danych
      const levelsDB = loadDB();           // zwraca { xp: {} }
      const profileDB = loadProfile();     // zwraca { users: {} }
      const config = loadConfig();

      const lvlData = levelsDB.xp?.[userId] || { xp: 0, level: 0 };
      const userData = profileDB.users?.[userId] || { 
        voice: 0, 
        daily: { msgs: 0, vc: 0, streak: 0 } 
      };

      const nextLevelXP = neededXP(lvlData.level);           // Poprawne wywołanie
      const progress = nextLevelXP > 0 
        ? Math.min(100, Math.floor((lvlData.xp / nextLevelXP) * 100)) 
        : 0;

      const xpLeft = Math.max(0, nextLevelXP - lvlData.xp);

      const totalVoiceMin = Math.floor((userData.voice || 0) / 60);
      const dailyVoiceMin = Math.floor((userData.daily.vc || 0) / 60);
      const dailyVoiceReq = 30 + ((userData.daily.streak || 0) * 5);

      const currentBoost = getCurrentBoost(userId);
      const rank = getRank(lvlData.level);
      const coins = getCoins(userId);

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
          `> Total: **${totalVoiceMin}** minut\n` +
          `> Daily: **${dailyVoiceMin} / ${dailyVoiceReq}** minut\n\n` +

          `**Daily Quest**\n` +
          `> Messages: **${userData.daily.msgs || 0}**\n` +
          `> Streak: **${userData.daily.streak || 0}** dni 🔥\n\n` +

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
