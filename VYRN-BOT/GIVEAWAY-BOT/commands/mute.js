const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const MUTE_ROLE = "1476000458240819301";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute user")
    .addUserOption(opt =>
      opt.setName("user").setDescription("User").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("time").setDescription("Time (e.g. 10m, 1h)").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason").setDescription("Reason").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);

    const time = interaction.options.getString("time");
    const reason = interaction.options.getString("reason") || "No reason";

    const muteRole = interaction.guild.roles.cache.get(MUTE_ROLE);

    if (!member || !muteRole) {
      return interaction.reply({ content: "❌ Error", ephemeral: true });
    }

    // ===== PARSE TIME =====
    const ms =
      time.endsWith("m") ? parseInt(time) * 60000 :
      time.endsWith("h") ? parseInt(time) * 3600000 :
      time.endsWith("d") ? parseInt(time) * 86400000 :
      null;

    if (!ms) {
      return interaction.reply({
        content: "❌ Wrong time format (use 10m / 1h / 1d)",
        ephemeral: true
      });
    }

    // ===== ADD ROLE =====
    await member.roles.add(muteRole).catch(() => {});

    // ===== DM =====
    try {
      const dm = new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("🔇 You have been muted")
        .setDescription(
          `📌 **Server:** ${interaction.guild.name}\n\n` +
          `⏱ **Time:** ${time}\n` +
          `📝 **Reason:** ${reason}`
        );

      await user.send({ embeds: [dm] });
    } catch {}

    // ===== RESPONSE =====
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🔇 User Muted")
      .setDescription(
        `👤 ${user}\n\n` +
        `⏱ **Time:** ${time}\n` +
        `📝 **Reason:** ${reason}`
      )
      .setFooter({ text: `By ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });

    // ===== AUTO UNMUTE =====
    setTimeout(async () => {
      if (member.roles.cache.has(muteRole.id)) {
        await member.roles.remove(muteRole).catch(() => {});
      }
    }, ms);
  }
};
