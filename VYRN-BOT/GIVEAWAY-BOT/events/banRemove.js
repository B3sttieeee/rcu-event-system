const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.GuildBanRemove,

  async execute(ban) {
    let executor = "Unknown";

    try {
      const logs = await ban.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberBanRemove
      });

      const entry = logs.entries.find(
        (log) =>
          log.target?.id === ban.user.id &&
          Date.now() - log.createdTimestamp < 15000
      );

      if (entry?.executor) {
        executor = `<@${entry.executor.id}>`;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setAuthor({
        name: ban.user.tag,
        iconURL: ban.user.displayAvatarURL()
      })
      .setTitle("♻️ User Unbanned")
      .addFields(
        { name: "👤 User", value: `<@${ban.user.id}>`, inline: true },
        { name: "🆔 ID", value: ban.user.id, inline: true },
        { name: "🛠 By", value: executor }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(ban.guild, LOGS.SYSTEM, embed);
  }
};
