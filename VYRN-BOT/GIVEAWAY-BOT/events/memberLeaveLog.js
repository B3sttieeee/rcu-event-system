const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    let type = "📤 Member Left";
    let executor = "Unknown";

    try {
      const logs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberKick
      });

      const log = logs.entries.first();

      if (log && log.target.id === member.id) {
        type = "👢 Member Kicked";
        executor = `<@${log.executor.id}>`;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle(type)

      .addFields(
        { name: "👤 User", value: `<@${member.id}>` },
        { name: "🆔 ID", value: member.id },
        { name: "🛠 By", value: executor }
      )

      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};
