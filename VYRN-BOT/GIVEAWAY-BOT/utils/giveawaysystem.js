const { createGiveaway } = require("../../utils/giveawaysystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription(" twórz giveaway!")
    .addStringOption(option =>
      option.setName("prize").setDescription("Co się wygrywa?").setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Ilu zwycięzców?")
        .setMinValue(1)
        .setMaxValue(100)
        .setDefault(1)
    )
    .addIntegerOption(option =>
      option
        .setName("time")
        .setDescription("Czas trwania giveawayu w sekundach (jeśli brak, to nieskończony)")
        .setMinValue(5)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const prize = interaction.options.getString("prize");
    const winners = interaction.options.getInteger("winners") || 1;
    const time = interaction.options.getInteger("time") || null;

    const result = await createGiveaway(
      interaction,
      { prize, winners, time }
    );

    if (!result.success) {
      return interaction.editReply({ content: "❌ Nie udało się utworzyć giveawayu." });
    }

    interaction.editReply({
      content: `🎁 Utworzono giveaway!`,
      embeds: [result.message.embeds[0]]
    });
  }
};
