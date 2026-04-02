const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { resumeGiveaway } = require("../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gwresume")
    .setDescription("Resume giveaway after restart")
    .addStringOption(option =>
      option.setName("message_id")
        .setDescription("Giveaway message ID")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    try {
      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString("message_id");

      const result = await resumeGiveaway(interaction.client, messageId);

      if (!result) {
        return interaction.editReply({
          content: "❌ Giveaway not found or cannot resume"
        });
      }

      return interaction.editReply({
        content: "✅ Giveaway resumed successfully"
      });

    } catch (err) {
      console.log("❌ RESUME ERROR:", err);

      return interaction.editReply({
        content: "❌ Error while resuming giveaway"
      });
    }
  }
};
