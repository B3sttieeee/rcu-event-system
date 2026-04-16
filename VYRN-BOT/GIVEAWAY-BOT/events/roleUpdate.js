const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  formatRoleList
} = require("./logSystem");

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

    const auditEntry = await findAuditEntry(newMember.guild, {
      type: AuditLogEvent.MemberRoleUpdate,
      match: (entry) => entry.target?.id === newMember.id
    });

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setAuthor({
        name: newMember.user.tag,
        iconURL: newMember.user.displayAvatarURL()
      })
      .setTitle("🏷 Roles Updated")
      .addFields(
        { name: "👤 User", value: `<@${newMember.id}>`, inline: true },
        { name: "🆔 ID", value: newMember.id, inline: true },
        { name: "🛠 By", value: formatExecutor(auditEntry) },
        { name: "➕ Added", value: formatRoleList(added) },
        { name: "➖ Removed", value: formatRoleList(removed) }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(newMember.guild, LOGS.SYSTEM, embed);
  }
};
