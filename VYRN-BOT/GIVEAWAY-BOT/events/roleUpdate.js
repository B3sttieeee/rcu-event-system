const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember) {
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (!added.size && !removed.size) return;

    let executor = "Unknown";

    try {
      const logs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate
      });

      const log = logs.entries.first();
      if (log) executor = `<@${log.executor.id}>`;
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setTitle("🏷 Role Update")

      .addFields(
        { name: "👤 User", value: `<@${newMember.id}>` },
        { name: "🛠 By", value: executor },
        {
          name: "➕ Added",
          value: added.map(r => `<@&${r.id}>`).join(", ") || "None"
        },
        {
          name: "➖ Removed",
          value: removed.map(r => `<@&${r.id}>`).join(", ") || "None"
        }
      )

      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(newMember.guild, LOGS.SYSTEM, embed);
  }
};
