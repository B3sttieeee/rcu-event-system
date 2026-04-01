const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== PATH =====
const DB_PATH = "/data/levels.json";

// ===== LOAD =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ xp: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
}

// ===== XP (TAKA SAMA JAK W LEVEL SYSTEM) =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== MEDALE =====
function getMedal(pos) {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `#${pos}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show server leaderboard"),

  async execute(interaction) {

    const db = loadDB();

    const sorted = Object.entries(db.xp || {})
      .sort((a, b) => {
        if (b[1].level === a[1].level) {
          return b[1].xp - a[1].xp;
        }
        return b[1].level - a[1].level;
      })
      .slice(0, 10);

    if (!sorted.length) {
      return interaction.reply({
        content: "❌ No leaderboard data yet",
        ephemeral: true
      });
    }

    const leaderboard = await Promise.all(
      sorted.map(async ([userId, data], i) => {
        let user;

        try {
          user = await interaction.client.users.fetch(userId);
        } catch {
          user = { username: "Unknown User" };
        }

        const needed = neededXP(data.level);

        return `${getMedal(i + 1)} **${user.username}**\n` +
               `🏆 Level: **${data.level}** • XP: **${data.xp}/${needed}**`;
      })
    );

    const embed = new EmbedBuilder()
      .setColor("#6366f1")
      .setTitle("🏆 GLOBAL LEADERBOARD")
      .setDescription(leaderboard.join("\n\n"))
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
