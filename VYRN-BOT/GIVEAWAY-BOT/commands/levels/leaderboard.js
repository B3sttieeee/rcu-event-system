const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const DB_PATH = path.join(DATA_DIR, "levels.json");

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const emptyDB = { xp: {} };
      fs.writeFileSync(DB_PATH, JSON.stringify(emptyDB, null, 2));
      console.log("[LEADERBOARD] Utworzono nowy levels.json");
      return emptyDB;
    }

    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return raw.trim() ? JSON.parse(raw) : { xp: {} };
  } catch (err) {
    console.error("❌ Błąd odczytu levels.json:", err.message);
    return { xp: {} };
  }
}

function neededXP(level) {
  const currentLevel = Math.max(0, Number(level) || 0);
  return Math.floor(100 * Math.pow(currentLevel + 1, 1.5)); // Poprawione: na następny poziom
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

      // Sortowanie: najpierw po levelu (malejąco), potem po XP
      const sorted = Object.entries(xpData)
        .sort((a, b) => {
          const levelA = Number(a[1]?.level) || 0;
          const levelB = Number(b[1]?.level) || 0;
          const xpA = Number(a[1]?.xp) || 0;
          const xpB = Number(b[1]?.xp) || 0;

          if (levelB !== levelA) return levelB - levelA;
          return xpB - xpA;
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
            username = user.username || user.tag || "Nieznany";
          } catch (e) {}

          const level = Number(data?.level) || 0;
          const xp = Number(data?.xp) || 0;
          const needed = neededXP(level);
          const progress = needed > 0 
            ? Math.min(100, Math.floor((xp / needed) * 100)) 
            : 0;

          return `${getMedal(index + 1)} **${username}**\n` +
                 `🏆 **Level ${level}** • ${xp}/${needed} XP ` +
                 `\`${progress}%\``;
        })
      );

      const embed = new EmbedBuilder()
        .setColor("#0a0a0a")                    // Ciemny motyw - spójny z resztą bota
        .setTitle("🏆 Ranking Poziomów")
        .setDescription(leaderboardEntries.join("\n\n"))
        .setFooter({
          text: `VYRN Clan • Top 10`,
          iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
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
