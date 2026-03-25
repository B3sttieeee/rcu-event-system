const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const { createCase } = require("../utils/moderation");

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
    const member = interaction.guild.members.cache.get(user.id);

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
    let ms;
    let prettyTime;

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

    // ===== CREATE CASE =====
    const caseData = createCase({
      userId: user.id,
      moderatorId: interaction.user.id,
      type: "MUTE",
      reason,
      duration: prettyTime
    });

    // ===== DM =====
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("🔇 You have been muted")
        .setDescription(
          `📌 Server: **${interaction.guild.name}**\n\n` +
          `🆔 Case: **#${caseData.id}**\n` +
          `⏱ Time: **${prettyTime}**\n` +
          `📝 Reason: **${reason}**`
        );

      await user.send({ embeds: [dmEmbed] });
    } catch {}

    // ===== RESPONSE =====
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🔇 User Muted")
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `👤 ${user}\n\n` +
        `🆔 Case: **#${caseData.id}**\n` +
        `⏱ Time: **${prettyTime}**\n` +
        `📝 Reason: **${reason}**`
      )
      .setFooter({ text: `Moderator: ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });

    // ===== AUTO UNMUTE =====
    setTimeout(async () => {
      try {
        if (member.roles.cache.has(muteRole.id)) {
          await member.roles.remove(muteRole);

          createCase({
            userId: user.id,
            moderatorId: interaction.client.user.id,
            type: "AUTO_UNMUTE",
            reason: "Mute expired"
          });
        }
      } catch {}
    }, ms);
  }
};
