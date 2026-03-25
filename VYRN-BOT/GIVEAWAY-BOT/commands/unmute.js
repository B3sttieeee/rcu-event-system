const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const MUTE_ROLE = "1476000458240819301";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute user")
    .addUserOption(opt =>
      opt.setName("user").setDescription("User").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);

    const muteRole = interaction.guild.roles.cache.get(MUTE_ROLE);

    if (!member || !muteRole) {
      return interaction.reply({ content: "❌ Error", ephemeral: true });
    }

    if (!member.roles.cache.has(muteRole.id)) {
      return interaction.reply({
        content: "❌ User is not muted",
        ephemeral: true
      });
    }

    await member.roles.remove(muteRole).catch(() => {});

    // ===== DM =====
    try {
      const dm = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("🔊 You have been unmuted")
        .setDescription(`Server: ${interaction.guild.name}`);

      await user.send({ embeds: [dm] });
    } catch {}

    // ===== RESPONSE =====
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🔊 User Unmuted")
      .setDescription(`👤 ${user}`)
      .setFooter({ text: `By ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  }
};
