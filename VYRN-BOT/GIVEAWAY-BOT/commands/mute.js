const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const ms = require("ms");

const MUTE_ROLE = "1476000458240819301";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute user")
    .addUserOption(o => o.setName("user").setRequired(true))
    .addStringOption(o => o.setName("time").setRequired(true))
    .addStringOption(o => o.setName("reason").setRequired(true)),

  async execute(interaction) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: "❌ No perms", ephemeral: true });
    }

    const user = interaction.options.getMember("user");
    const time = interaction.options.getString("time");
    const reason = interaction.options.getString("reason");

    const duration = ms(time);

    await user.roles.add(MUTE_ROLE);

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🔇 User Muted")
      .setDescription(`${user} muted`)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Time", value: time }
      );

    interaction.reply({ embeds: [embed] });

    setTimeout(() => {
      user.roles.remove(MUTE_ROLE).catch(() => {});
    }, duration);
  }
};
