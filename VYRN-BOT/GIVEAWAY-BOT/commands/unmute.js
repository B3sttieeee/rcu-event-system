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
    try {

      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const muteRole = interaction.guild.roles.cache.get(MUTE_ROLE);

      if (!member || !muteRole) {
        return interaction.reply({
          content: "❌ User or role not found",
          ephemeral: true
        });
      }

      if (!member.roles.cache.has(muteRole.id)) {
        return interaction.reply({
          content: "❌ User is not muted",
          ephemeral: true
        });
      }

      // ===== REMOVE ROLE =====
      await member.roles.remove(muteRole).catch(() => {});

      // ===== EMBED =====
      const embed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("🔊 User Unmuted")
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
          `👤 ${user}\n\n` +
          `🛠 Moderator: ${interaction.user}\n` +
          `📌 Status: **Unmuted**`
        )
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // ===== DM =====
      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#22c55e")
              .setTitle("🔊 You have been unmuted")
              .setDescription(`Server: **${interaction.guild.name}**`)
          ]
        });
      } catch {}

    } catch (err) {
      console.log("❌ UNMUTE ERROR:", err);

      interaction.reply({
        content: "❌ Error",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
