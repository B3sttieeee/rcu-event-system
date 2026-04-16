const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

const formatRoles = (roles) => {
  if (!roles.size) return "None";

  const text = roles.map((role) => `<@&${role.id}>`).join(", ");
  return text.length > 1024 ? `${text.slice(0, 1021)}...` : text;
};

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember) {
    const added = newMember.roles.cache.filter(
      (role) => !oldMember.roles.cache.has(role.id)
    );

    const removed = oldMember.roles.cache.filter(
      (role) => !newMember.roles.cache.has(role.id)
    );

    if (!added.size && !removed.size) return;

    let executor = "Unknown";

    try {
      const logs = await newMember.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberRoleUpdate
      });

      const entry = logs.entries.find(
        (log) =>
          log.target?.id === newMember.id &&
          Date.now() - log.createdTimestamp < 15000
      );

      if (entry?.executor) {
        executor = `<@${entry.executor.id}>`;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setAuthor({
        name: newMember.user.tag,
        iconURL: newMember.user.displayAvatarURL()
      })
      .setTitle("🏷 Role Update")
      .addFields(
        { name: "👤 User", value: `<@${newMember.id}>`, inline: true },
        { name: "🆔 ID", value: newMember.id, inline: true },
        { name: "🛠 By", value: executor },
        { name: "➕ Added", value: formatRoles(added) },
        { name: "➖ Removed", value: formatRoles(removed) }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(newMember.guild, LOGS.SYSTEM, embed);
  }
};
