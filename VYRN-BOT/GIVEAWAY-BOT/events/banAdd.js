const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.GuildBanAdd,

  async execute(ban) {
    let executor = "Unknown";

    try {
      const logs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd
      });

      const log = logs.entries.first();
      if (log) executor = `<@${log.executor.id}>`;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🔨 User Banned")

      .addFields(
        { name: "👤 User", value: `<@${ban.user.id}>` },
        { name: "🛠 By", value: executor }
      )

      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(ban.guild, LOGS.SYSTEM, embed);
  }
};
