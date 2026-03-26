const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// ===== PATH =====
const LEVEL_DB = "/data/levels.json";
const PROFILE_DB = "/data/profile.json";

// ===== LOAD =====
function loadLevels() {
  if (!fs.existsSync(LEVEL_DB)) {
    fs.writeFileSync(LEVEL_DB, JSON.stringify({ xp: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(LEVEL_DB));
}

function loadProfile() {
  if (!fs.existsSync(PROFILE_DB)) {
    fs.writeFileSync(PROFILE_DB, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(PROFILE_DB));
}

// ===== XP =====
function neededXP(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// ===== PROGRESS BAR =====
function createBar(current, needed) {
  const percent = Math.floor((current / needed) * 100);
  const filled = Math.round(percent / 10);

  let bar = "";

  for (let i = 0; i < 10; i++) {
    if (i < filled) {
      if (percent < 25) bar += "🟥";
      else if (percent < 50) bar += "🟧";
      else if (percent < 75) bar += "🟨";
      else bar += "🟩";
    } else {
      bar += "⬛";
    }
  }

  return { bar, percent };
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

    // ===== EMBED (WIDE STYLE) =====
    const embed = new EmbedBuilder()
      .setColor("#0f172a")
      .setAuthor({
        name: `${interaction.user.username} • PROFILE`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))

      .addFields(
        {
          name: "🏆 LEVEL",
          value: `\`${lvlData.level}\``,
          inline: true
        },
        {
          name: "📊 XP",
          value: `\`${lvlData.xp} / ${needed}\`\n${bar} **${percent}%**`,
          inline: true
        },
        {
          name: "⚡ STATUS",
          value: percent >= 75 ? "🟢 High Progress" :
                 percent >= 40 ? "🟡 Medium Progress" :
                 "🔴 Low Progress",
          inline: true
        },

        { name: " ", value: " ", inline: false },

        {
          name: "🎤 VOICE",
          value: `⏱️ \`${vcMinutes} min\``,
          inline: true
        },
        {
          name: "💬 MESSAGES",
          value: `\`${user.daily.msgs} / 50\``,
          inline: true
        },
        {
          name: "🎯 DAILY VC",
          value: `\`${Math.floor(user.daily.vc / 60)} / 30 min\``,
          inline: true
        }
      )

      .setFooter({
        text: "VYRN System • Profile",
        iconURL: interaction.client.user.displayAvatarURL()
      })

      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
