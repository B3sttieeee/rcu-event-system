const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createGiveaway } = require("../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create giveaway")

    .addStringOption(opt =>
      opt.setName("prize")
        .setDescription("Prize")
        .setRequired(true)
    )

    .addIntegerOption(opt =>
      opt.setName("winners")
        .setDescription("Number of winners")
        .setRequired(true)
    )

    .addStringOption(opt =>
      opt.setName("time")
        .setDescription("Time (10s, 5m, 1h, 1d)")
        .setRequired(true)
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const prize = interaction.options.getString("prize");
    const winners = interaction.options.getInteger("winners");
    const time = interaction.options.getString("time");

    // 🔥 TU TWORZYSZ DATA (TEGO CI BRAKOWAŁO)
    const data = {
      prize,
      winners,
      time
    };

    try {
      await createGiveaway(interaction, data);

      await interaction.reply({
        content: "🎉 Giveaway created!",
        ephemeral: true
      });

    } catch (err) {
      console.log(err);

      await interaction.reply({
        content: "❌ Error creating giveaway (time format np: 10m)",
        ephemeral: true
      });
    }
  }
};
