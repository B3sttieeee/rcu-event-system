const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const { createCase } = require("../utils/moderation");

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

    await member.roles.remove(muteRole).catch(() => {});

    const caseData = createCase({
      userId: user.id,
      moderatorId: interaction.user.id,
      type: "UNMUTE",
      reason: "Manual unmute"
    });

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🔊 User Unmuted")
      .setDescription(
        `👤 ${user}\n\n🆔 Case: **#${caseData.id}**`
      );

    interaction.reply({ embeds: [embed] });
  }
};
