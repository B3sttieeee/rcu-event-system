const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { getUserCases } = require("../utils/moderation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("User history")
    .addUserOption(opt =>
      opt.setName("user").setDescription("User").setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");

    const cases = getUserCases(user.id);

    if (!cases.length) {
      return interaction.reply({
        content: "❌ No history",
        ephemeral: true
      });
    }

    const desc = cases
      .slice(-10)
      .reverse()
      .map(c =>
        `🆔 **#${c.id}** • ${c.type}\n` +
        `📝 ${c.reason}\n` +
        `⏱ ${c.duration || "—"}`
      )
      .join("\n\n");

    const embed = new EmbedBuilder()
      .setColor("#6366f1")
      .setTitle(`📜 History • ${user.username}`)
      .setDescription(desc);

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
