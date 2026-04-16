const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    if (member.user.bot) return;

    let title = "📤 Member Left";
    let executor = "Unknown";

    try {
      const logs = await member.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberKick
      });

      const entry = logs.entries.find(
        (log) =>
          log.target?.id === member.id &&
          Date.now() - log.createdTimestamp < 15000
      );

      if (entry?.executor) {
        title = "👢 Member Kicked";
        executor = `<@${entry.executor.id}>`;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL()
      })
      .setTitle(title)
      .addFields(
        { name: "👤 User", value: `<@${member.id}>`, inline: true },
        { name: "🆔 ID", value: member.id, inline: true },
        { name: "🛠 By", value: executor }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};
