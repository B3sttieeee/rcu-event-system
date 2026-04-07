const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ====================== CONFIG ======================
const DB_PATH = "/data/levels.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {} }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (err) {
    console.error("❌ Błąd odczytu levels.json:", err.message);
    return { xp: {} };
  }
}

function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function getMedal(pos) {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `**${pos}.**`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("🏆 Pokazuje ranking poziomów na serwerze"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const db = loadDB();
      const xpData = db.xp || {};

      // Sortowanie: najpierw po levelu, potem po XP
      const sorted = Object.entries(xpData)
        .sort((a, b) => {
          if (b[1].level === a[1].level) {
            return b[1].xp - a[1].xp;
          }
          return b[1].level - a[1].level;
        })
        .slice(0, 10); // Top 10

      if (sorted.length === 0) {
        return interaction.editReply({
          content: "❌ Jeszcze nikt nie zdobył doświadczenia na serwerze.",
          ephemeral: true
        });
      }

      const leaderboardEntries = await Promise.all(
        sorted.map(async ([userId, data], index) => {
          let username = "Nieznany użytkownik";
          try {
            const user = await interaction.client.users.fetch(userId);
            username = user.username;
          } catch {}

          const needed = neededXP(data.level);
          const progress = needed > 0 
            ? Math.floor((data.xp / needed) * 100) 
            : 0;

          return `${getMedal(index + 1)} **${username}**\n` +
                 `🏆 **Level ${data.level}** • ${data.xp}/${needed} XP ` +
                 `\`${progress}%\``;
        })
      );

      const embed = new EmbedBuilder()
        .setColor("#6366f1")
        .setTitle("🏆 Ranking Poziomów")
        .setDescription(leaderboardEntries.join("\n\n"))
        .setFooter({
          text: `VYRN Clan • Top 10`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Błąd w /leaderboard:", err);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas ładowania rankingu.",
        ephemeral: true
      });
    }
  }
};
