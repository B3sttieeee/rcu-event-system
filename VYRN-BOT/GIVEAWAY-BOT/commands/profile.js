const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const DB_PATH = "./data.json";
const PROFILE_PATH = "./profile.json";

// ===== LOAD =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { xp: {} };
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function loadProfile() {
  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(PROFILE_PATH));
}

// ===== XP =====
function neededXP(level) {
  return 100 + level * 75 + level * level * 10; // 🔥 trudniejsze levele
}

// ===== PROGRESS BAR =====
function progressBar(current, max) {
  const percent = Math.floor((current / max) * 100);
  const filled = Math.round(percent / 10);

  return {
    bar: "🟩".repeat(filled) + "⬛".repeat(10 - filled),
    percent
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show your profile"),

  async execute(interaction) {

    const db = loadDB();
    const profile = loadProfile();

    const userId = interaction.user.id;

    const data = db.xp[userId] || { xp: 0, level: 0 };
    const user = profile.users[userId] || {
      voice: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const needed = neededXP(data.level);
    const { bar, percent } = progressBar(data.xp, needed);

    const vcMinutes = Math.floor(user.voice / 60);

    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: `${interaction.user.username} • Profile`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
`🏆 **LEVEL SYSTEM**

✨ Level: **${data.level}**
📊 XP: **${data.xp} / ${needed}**
${bar} \`${percent}%\`

━━━━━━━━━━━━━━━━━━

🎤 **VOICE ACTIVITY**
⏱️ Time: **${vcMinutes} minutes**

━━━━━━━━━━━━━━━━━━

🎯 **DAILY PROGRESS**
💬 Messages: **${user.daily.msgs} / 50**
🎤 Voice: **${Math.floor(user.daily.vc / 60)} / 30 min**

━━━━━━━━━━━━━━━━━━

🚀 Keep grinding to level up faster!`
      )
      .setFooter({
        text: "VYRN System • Profile",
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
