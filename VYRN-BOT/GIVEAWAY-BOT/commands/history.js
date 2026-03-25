const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const PATH = "./models/warnings.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("Check your warnings")
    .addUserOption(o => o.setName("user").setDescription("User")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;

    const db = JSON.parse(fs.readFileSync(PATH));

    const warns = db.warnings[target.id] || [];

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setTitle(`📜 History • ${target.username}`)
      .setDescription(
        warns.length === 0
          ? "No warnings"
          : warns.map(w =>
              `🆔 #${w.case} • ${w.reason}`
            ).join("\n")
      );

    interaction.reply({ embeds: [embed] });
  }
};
