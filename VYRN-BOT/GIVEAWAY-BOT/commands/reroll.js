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

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const id = interaction.options.getString("messageid");

      const result = await reroll(client, id);

      if (!result) {
        return interaction.editReply({
          content: "❌ Nie udało się wylosować zwycięzcy"
        });
      }

      await interaction.editReply({
        content: `🎉 New winner: ${result}`
      });

    } catch (err) {
      console.log("❌ REROLL ERROR:", err);

      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas rerolla"
      });
    }
  }
};
