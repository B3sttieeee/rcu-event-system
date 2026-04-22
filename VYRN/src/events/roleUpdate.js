// src/events/roleUpdate.js
const { Events, AuditLogEvent } = require("discord.js");
const { 
  LOGS, 
  LOG_COLORS, 
  formatTime, 
  sendLog, 
  findAuditEntry, 
  formatExecutor, 
  formatRoleList, 
  createLogEmbed 
} = require("../systems/log");

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    if (!added.size && !removed.size) return;

    const auditEntry = await findAuditEntry(newMember.guild, {
      type: AuditLogEvent.MemberRoleUpdate,
      match: (entry) => entry.target?.id === newMember.id
    });

    const executor = formatExecutor(auditEntry);

    const embed = createLogEmbed(
      "🏷️ Roles Updated",
      LOG_COLORS.SYSTEM,
      `**Użytkownik:** ${newMember} (${newMember.user.tag})`,
      [
        { name: "🆔 ID", value: `\`${newMember.id}\``, inline: true },
        { name: "🛠 Wykonano przez", value: executor, inline: true },
        { name: "➕ Dodane role", value: formatRoleList(added, 900) || "Brak", inline: false },
        { name: "➖ Usunięte role", value: formatRoleList(removed, 900) || "Brak", inline: false },
      ],
      `Time: ${formatTime()}`
    );

    await sendLog(newMember.guild, LOGS.SYSTEM, embed);
  }
};
