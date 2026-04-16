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
  name: Events.GuildBanAdd,

  async execute(ban) {
    const auditEntry = await findAuditEntry(ban.guild, {
      type: AuditLogEvent.MemberBanAdd,
      match: (entry) => entry.target?.id === ban.user.id
    });

    const reason = ban.reason || auditEntry?.reason || null;

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: ban.user.tag,
        iconURL: ban.user.displayAvatarURL()
      })
      .setTitle("🔨 User Banned")
      .addFields(
        { name: "👤 User", value: `<@${ban.user.id}>`, inline: true },
        { name: "🆔 ID", value: ban.user.id, inline: true },
        { name: "🛠 By", value: formatExecutor(auditEntry) }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    if (reason) {
      embed.addFields({
        name: "📝 Reason",
        value: clampText(reason, 1024, "No reason")
      });
    }

    await sendLog(ban.guild, LOGS.SYSTEM, embed);
  }
};
