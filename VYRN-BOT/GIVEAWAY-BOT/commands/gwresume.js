const { SlashCommandBuilder } = require("discord.js");
const { resumeGiveaway } = require("../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gwresume")
    .setDescription("Wznawia giveaway po restarcie")
    .addStringOption(option =>
      option.setName("message_id")
        .setDescription("ID wiadomości giveaway")
        .setRequired(true)
    ),

  async execute(interaction) {

    // 🔒 tylko admin
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "❌ Brak permisji",
        ephemeral: true
      });
    }

    const messageId = interaction.options.getString("message_id");

    try {
      const result = await resumeGiveaway(interaction.client, messageId);

      if (!result) {
        return interaction.reply({
          content: "❌ Giveaway nie znaleziony",
          ephemeral: true
        });
      }

      return interaction.reply({
        content: "✅ Giveaway wznowiony",
        ephemeral: true
      });

    } catch (err) {
      console.log(err);
      return interaction.reply({
        content: "❌ Błąd przy wznawianiu",
        ephemeral: true
      });
    }
  }
};
