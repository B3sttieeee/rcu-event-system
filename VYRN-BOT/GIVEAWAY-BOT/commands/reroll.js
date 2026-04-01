const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reroll } = require("../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("Reroll giveaway winner")
    .addStringOption(opt =>
      opt.setName("messageid")
        .setDescription("Giveaway message ID")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const id = interaction.options.getString("messageid");

      const result = await reroll(interaction.client, id);

      if (!result || result.includes("❌")) {
        return interaction.editReply({
          content: "❌ Nie udało się wylosować zwycięzcy"
        });
      }

      await interaction.editReply({
        content: `🎉 New winner: ${result}`
      });

    } catch (err) {
      console.log("❌ REROLL ERROR:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ Wystąpił błąd podczas rerolla"
        });
      } else {
        await interaction.reply({
          content: "❌ Wystąpił błąd podczas rerolla",
          ephemeral: true
        });
      }
    }
  }
};
