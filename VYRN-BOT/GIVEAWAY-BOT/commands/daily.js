const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const PROFILE_PATH = "/data/profile.json";

// ===== LOAD
function loadProfile() {
  if (!fs.existsSync("/data")) fs.mkdirSync("/data");

  if (!fs.existsSync(PROFILE_PATH)) {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify({
      users: {}
    }, null, 2));
  }

  return JSON.parse(fs.readFileSync(PROFILE_PATH));
}

function saveProfile(data) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(data, null, 2));
}

// ===== COMMAND
module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("🎯 Claim your daily reward"),

  async execute(interaction) {
    const db = loadProfile();

    if (!db.users[interaction.user.id]) {
      db.users[interaction.user.id] = {
        voice: 0,
        daily: { msgs: 0, vc: 0, completed: false }
      };
    }

    const user = db.users[interaction.user.id];

    // ===== REQUIREMENTS
    const needMsgs = 50;
    const needVC = 30 * 60; // 30 min

    if (user.daily.completed) {
      return interaction.reply({
        content: "❌ Już odebrałeś daily dziś!",
        ephemeral: true
      });
    }

    if (user.daily.msgs < needMsgs || user.daily.vc < needVC) {
      return interaction.reply({
        content:
          `❌ Nie spełniasz wymagań!\n` +
          `💬 Wiadomości: ${user.daily.msgs}/${needMsgs}\n` +
          `🎧 Voice: ${Math.floor(user.daily.vc / 60)}/30 min`,
        ephemeral: true
      });
    }

    // ===== REWARD
    user.daily.completed = true;

    saveProfile(db);

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎁 Daily Reward")
      .setDescription("Otrzymałeś nagrodę!\n\n✨ +100 XP")
      .setFooter({ text: "VYRN Daily System" });

    await interaction.reply({ embeds: [embed] });
  }
};
