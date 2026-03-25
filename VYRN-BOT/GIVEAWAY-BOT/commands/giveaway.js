const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const { createGiveaway } = require("../utils/giveawaySystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create giveaway")

    .addStringOption(opt =>
      opt.setName("prize").setDescription("Prize").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("time").setDescription("Time (10m, 1h)").setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("winners").setDescription("Winners").setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName("channel").setDescription("Channel").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("image").setDescription("Image URL").setRequired(false)
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {

    const prize = interaction.options.getString("prize");
    const time = interaction.options.getString("time");
    const winners = interaction.options.getInteger("winners");
    const channel = interaction.options.getChannel("channel");
    const image = interaction.options.getString("image");

    await createGiveaway({
      client,
      channel,
      host: interaction.user,
      prize,
      duration: time,
      winners,
      image
    });

    interaction.reply({
      content: "✅ Giveaway created",
      ephemeral: true
    });
  }
};
