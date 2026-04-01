const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== PATHS
const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== LOAD LEVELS
function loadLevels() {
  if (!fs.existsSync("/data")) {
    fs.mkdirSync("/data", { recursive: true });
  }

  if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({ xp: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

// ===== LOAD PROFILE
function loadProfile() {
  if (!fs.existsSync(PROFILE_DB)) {
    fs.writeFileSync(PROFILE_DB, JSON.stringify({ users: {} }, null, 2));
  }

  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP FORMULA
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== PROGRESS BAR (PRO STYLE)
function createBar(current, needed) {
  const percent = Math.floor((current / needed) * 100);
  const filled = Math.round(percent / 10);

  let bar = "";

  for (let i = 0; i < 10; i++) {
    if (i < filled) bar += "🟩";
    else bar += "⬜";
  }

  return { bar, percent };
}

// ===== RANK TITLE
function getRank(level) {
  if (level >= 50) return "💎 Elite";
  if (level >= 30) return "🔥 Pro";
  if (level >= 15) return "⚡ Advanced";
  if (level >= 5) return "🌱 Beginner";
  return "🐣 Newbie";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("📊 Show your profile"),

  async execute(interaction) {

    const levels = loadLevels();
    const profile = loadProfile();

    const lvlData = levels.xp[interaction.user.id] || { xp: 0, level: 0 };

    const user = profile.users?.[interaction.user.id] || {
      voice: 0,
      daily: { msgs: 0, vc: 0 }
    };

    const needed = neededXP(lvlData.level);
    const { bar, percent } = createBar(lvlData.xp, needed);

    const vcMinutes = Math.floor(user.voice / 60);

    // ===== STATUS
    let status = "🔴 Low Progress";
    if (percent >= 40) status = "🟡 Medium Progress";
    if (percent >= 75) status = "🟢 High Progress";

    // ===== RANK
    const rank = getRank(lvlData.level);

    // ===== NEXT LEVEL INFO
    const remainingXP = needed - lvlData.xp;

    // ===== EMBED
    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: `${interaction.user.username} • PROFILE`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))

      .setDescription(
`🏆 **Level ${lvlData.level}** • ${rank}

📊 **XP Progress**
\`${lvlData.xp} / ${needed} XP\`
${bar} **${percent}%**

⬆️ **Next Level:** \`${remainingXP} XP left\`

━━━━━━━━━━━━━━━━━━

⚡ **Status:** ${status}

🎤 **Voice Time:** \`${vcMinutes} min\`
💬 **Messages:** \`${user.daily.msgs} / 50\`
🎯 **Daily Voice:** \`${Math.floor(user.daily.vc / 60)} / 30 min\`

━━━━━━━━━━━━━━━━━━

💡 **Tip:** Stay active to level up faster!`
      )

      .setFooter({
        text: "VYRN System • Advanced Profile",
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
