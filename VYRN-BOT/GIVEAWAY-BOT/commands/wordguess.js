const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { tryStartRandomGame } = require("../utils/wordGuessSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordguess")
    .setDescription("🔤 Ręcznie uruchamia grę zgadywania słowa")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option =>
      option
        .setName("kanał")
        .setDescription("Kanał, na którym ma się rozpocząć gra")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel("kanał") || interaction.channel;

    if (!targetChannel.isTextBased()) {
      return interaction.editReply("❌ Wybrany kanał nie jest tekstowy.");
    }

    const result = await tryStartRandomGame(targetChannel, true); // true = forced

    if (result.success) {
      await interaction.editReply(`✅ Gra zgadywania słowa została uruchomiona na kanale ${targetChannel}`);
    } else if (result.reason === "game_already_running") {
      await interaction.editReply("❌ Gra już trwa na tym serwerze!");
    } else {
      await interaction.editReply("❌ Nie udało się uruchomić gry.");
    }
  }
};
