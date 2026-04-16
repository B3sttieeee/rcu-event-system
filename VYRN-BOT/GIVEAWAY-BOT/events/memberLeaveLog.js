const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  clampText
} = require("./logSystem");

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    const kickEntry = await findAuditEntry(member.guild, {
      type: AuditLogEvent.MemberKick,
      match: (entry) => entry.target?.id === member.id
    });

    const title = kickEntry
      ? "👢 Member Kicked"
      : member.user.bot
        ? "🤖 Bot Removed"
        : "📤 Member Left";

    const actor = kickEntry ? formatExecutor(kickEntry) : "User left on their own";
    const reason = kickEntry?.reason
      ? clampText(kickEntry.reason, 1024, null)
      : null;

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
        { name: "🛠 By", value: actor }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    if (reason) {
      embed.addFields({ name: "📝 Reason", value: reason });
    }

    await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};
