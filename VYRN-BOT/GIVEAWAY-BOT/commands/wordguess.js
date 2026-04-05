const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { tryStartRandomGame } = require("../utils/wordGuessSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordguess")
    .setDescription("🔤 Ręcznie uruchamia grę zgadywania losowego słowa")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option =>
      option
        .setName("kanał")
        .setDescription("Kanał, na którym ma się rozpocząć gra (domyślnie bieżący)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel("kanał") || interaction.channel;

    // Sprawdzenie czy kanał jest tekstowy
    if (!targetChannel.isTextBased()) {
      return interaction.editReply({
        content: "❌ Wybrany kanał nie jest kanałem tekstowym.",
        ephemeral: true
      });
    }

    const started = await tryStartRandomGame(targetChannel);

    if (started) {
      await interaction.editReply({
        content: `✅ Gra zgadywania słowa została uruchomiona na kanale ${targetChannel}`,
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        content: "❌ Nie udało się uruchomić gry. Możliwe, że gra już trwa lub szansa nie została spełniona.",
        ephemeral: true
      });
    }
  }
};
