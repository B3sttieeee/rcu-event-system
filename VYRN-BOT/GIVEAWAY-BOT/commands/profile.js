const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { loadProfile } = require("../utils/profileSystem");
const { addXP, loadConfig } = require("../utils/levelSystem"); // nie potrzebujemy loadDB

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Wyświetla Twój szczegółowy profil w VYRN Clan"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      const member = interaction.member;

      // Pobieramy dane
      const levelData = getLevelData(userId);
      const profileData = getProfileData(userId);
      const config = loadConfig();

      const rankInfo = getRank(levelData.level);
      const progress = calculateProgress(levelData.xp, levelData.level);

      const embed = new EmbedBuilder()
        .setColor("#0f172a")
        .setAuthor({
          name: `${interaction.user.username} • Profil`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
`🏆 **${rankInfo.emoji} Level ${levelData.level} • ${rankInfo.name}**

<a:XP:1488763317857161377> **XP:** \`${formatNumber(levelData.xp)} / ${formatNumber(progress.needed)}\`
${progress.bar} \`${progress.percent}%\`
<:Next:1488760924193161337> **Do następnego poziomu:** \`${formatNumber(progress.left)}\` XP

━━━━━━━━━━━━━━
<a:TimeS:1488760889560797314> **Czas na VC:** \`${formatNumber(profileData.voiceMinutes)}\` minut
<:Messages:1488763434966192242> **Wiadomości dzisiaj:** \`${profileData.dailyMsgs}\`
<:Zadania:1488763408026435594> **Daily VC dzisiaj:** \`${profileData.dailyVCMinutes} / ${profileData.dailyVCRequired}\` min

🔥 **Streak daily:** ${profileData.streak} ${profileData.streak >= 5 ? "🔥" : ""}
⚡ **Boost:** ${member.roles.cache.has(config.boostRole || "1476000398107217980") ? "✅ **Aktywny**" : "❌ Nieaktywny"}
🌍 **Global Multiplier:** \`${config.globalMultiplier || 1}x\``
        )
        .setFooter({ 
          text: "VYRN Clan • Im więcej grasz, tym szybciej rośniesz",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("❌ Błąd w komendzie /profile:", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas ładowania profilu. Spróbuj ponownie później.",
        ephemeral: true
      });
    }
  }
};

// ====================== POMOCNICZE FUNKCJE ======================

/** Pobieranie danych poziomów */
function getLevelData(userId) {
  const fs = require("fs");
  const LEVEL_DB = "./data/levels.json";

  let levels = { xp: {} };
  if (fs.existsSync(LEVEL_DB)) {
    try {
      levels = JSON.parse(fs.readFileSync(LEVEL_DB, "utf-8"));
    } catch (e) {
      console.error("Błąd odczytu levels.json", e);
    }
  }

  return levels.xp?.[userId] || { xp: 0, level: 0 };
}

/** Pobieranie danych profilu */
function getProfileData(userId) {
  const profile = loadProfile();
  const user = profile.users?.[userId] || {};
  const daily = user.daily || { msgs: 0, vc: 0, streak: 0 };

  return {
    voiceMinutes: Math.floor((user.voice || 0) / 60),
    dailyMsgs: daily.msgs || 0,
    dailyVCMinutes: Math.floor((daily.vc || 0) / 60),
    streak: daily.streak || 0,
    dailyVCRequired: 30 + ((daily.streak || 0) * 5)
  };
}

function getRank(level) {
  const ranks = [
    { min: 75, name: "Legend",  emoji: "<:LegeRank:1488756343190847538>" },
    { min: 60, name: "Ruby",    emoji: "<:RubyRank:1488756400514404372>" },
    { min: 45, name: "Diamond", emoji: "<:DiaxRank:1488756482924089404>" },
    { min: 30, name: "Platinum",emoji: "<:PlatRank:1488756557863845958>" },
    { min: 15, name: "Gold",    emoji: "<:GoldRank:1488756524854808686>" },
    { min:  5, name: "Bronze",  emoji: "<:BronzeRank:1488756638285565962>" },
    { min:  0, name: "Iron",    emoji: "<:Ironrank:1488756604277887039>" }
  ];

  return ranks.find(r => level >= r.min) || ranks[ranks.length - 1];
}

function calculateProgress(xp, level) {
  const needed = Math.floor(100 * Math.pow(level, 1.5));
  const percent = needed > 0 ? Math.min(100, Math.floor((xp / needed) * 100)) : 0;
  const left = Math.max(0, needed - xp);

  const filled = Math.round(percent / 10);
  const bar = "▰".repeat(filled) + "▱".repeat(10 - filled);

  return { needed, percent, left, bar };
}

function formatNumber(num) {
  return num.toLocaleString("en-US");
}
