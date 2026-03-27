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

    await interaction.deferReply(); // 🔥 FIX

    const id = interaction.options.getString("messageid");

    const result = await reroll(client, id);

    await interaction.editReply({
      content: `🎉 New winner: ${result}`
    });
  }
};
