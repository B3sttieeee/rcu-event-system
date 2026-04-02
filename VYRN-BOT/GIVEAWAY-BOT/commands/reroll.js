const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reroll } = require("../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reroll")
    .setDescription("🎉 Reroll giveaway winner")

    .addStringOption(opt =>
      opt.setName("messageid")
        .setDescription("ID wiadomości giveaway")
        .setRequired(true)
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {

      await interaction.deferReply({ ephemeral: true });

      const messageId = interaction.options.getString("messageid");

      // 🔥 ważne: sprawdzamy czy ID wygląda legitnie
      if (!/^\d{17,20}$/.test(messageId)) {
        return interaction.editReply({
          content: "❌ Nieprawidłowe ID wiadomości"
        });
      }

      const result = await reroll(interaction.client, messageId);

      if (!result || result.startsWith("❌")) {
        return interaction.editReply({
          content: result || "❌ Nie udało się zrobić rerolla"
        });
      }

      await interaction.editReply({
        content: `🎉 **Nowy zwycięzca:** ${result}`
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
