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
      opt.setName("user")
        .setDescription("User")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("time")
        .setDescription("Time (10m, 1h, 1d)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const time = interaction.options.getString("time");
    const reason = interaction.options.getString("reason") || "No reason";

    const muteRole = interaction.guild.roles.cache.get(MUTE_ROLE);

    if (!member || !muteRole) {
      return interaction.reply({
        content: "❌ User or role not found",
        ephemeral: true
      });
    }

    // ===== PARSE TIME =====
    let ms = 0;
    let prettyTime = "Unknown";

    if (time.endsWith("m")) {
      ms = parseInt(time) * 60000;
      prettyTime = `${parseInt(time)} min`;
    } else if (time.endsWith("h")) {
      ms = parseInt(time) * 3600000;
      prettyTime = `${parseInt(time)} h`;
    } else if (time.endsWith("d")) {
      ms = parseInt(time) * 86400000;
      prettyTime = `${parseInt(time)} d`;
    }

    if (!ms || isNaN(ms)) {
      return interaction.reply({
        content: "❌ Use correct format: 10m / 1h / 1d",
        ephemeral: true
      });
    }

    // ===== ADD ROLE =====
    await member.roles.add(muteRole).catch(() => {});

    // ===== DM =====
    try {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#ef4444")
            .setTitle("🔇 You have been muted")
            .setDescription(
              `📌 Server: **${interaction.guild.name}**\n\n` +
              `⏱ Time: **${prettyTime}**\n` +
              `📝 Reason: **${reason}**`
            )
        ]
      });
    } catch {}

    // ===== RESPONSE =====
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🔇 User Muted")
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `👤 ${user}\n\n` +
        `⏱ Time: **${prettyTime}**\n` +
        `📝 Reason: **${reason}**`
      )
      .setFooter({ text: `Moderator: ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });

    // ===== AUTO UNMUTE =====
    setTimeout(async () => {
      try {
        const freshMember = await interaction.guild.members.fetch(user.id);

        if (freshMember.roles.cache.has(muteRole.id)) {
          await freshMember.roles.remove(muteRole);
        }
      } catch {}
    }, ms);
  }
};
