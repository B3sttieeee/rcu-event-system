const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const PATH = "./models/warnings.json";

function load() {
  return JSON.parse(fs.readFileSync(PATH));
}

function save(data) {
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn user")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName("user").setRequired(true).setDescription("User"))
    .addStringOption(o => o.setName("reason").setRequired(true).setDescription("Reason")),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    const db = load();

    db.cases++;

    if (!db.warnings[user.id]) db.warnings[user.id] = [];

    db.warnings[user.id].push({
      case: db.cases,
      reason,
      moderator: interaction.user.id,
      date: Date.now()
    });

    save(db);

    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setTitle("⚠️ Warning")
      .setDescription(
        `👤 ${user}\n📌 ${reason}\n🆔 Case #${db.cases}`
      );

    interaction.reply({ embeds: [embed] });
  }
};
