const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("testjoin")
    .setDescription("🧪 Test welcome event")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const member = interaction.member;

    try {
      const event = require("../events/guildMemberAdd");

      await event.execute(member);

      await interaction.reply({
        content: "✅ Test wykonany (welcome + rola)",
        ephemeral: true
      });

    } catch (err) {
      console.log(err);

      await interaction.reply({
        content: "❌ Błąd testu",
        ephemeral: true
      });
    }

  }
};
