const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  LOG_COLORS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  formatRoleList,
  createLogEmbed   // nowa funkcja z poprzedniej wersji logSystem
} = require("../utils/logSystem");

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Oblicz różnice ról
    const added = newMember.roles.cache.filter(
      (role) => !oldMember.roles.cache.has(role.id)
    );

    const removed = oldMember.roles.cache.filter(
      (role) => !newMember.roles.cache.has(role.id)
    );

    // Jeśli nic się nie zmieniło – wychodzimy
    if (!added.size && !removed.size) return;

    // Szukamy kto zmienił role (audit log)
    const auditEntry = await findAuditEntry(newMember.guild, {
      type: AuditLogEvent.MemberRoleUpdate,
      match: (entry) => entry.target?.id === newMember.id
    });

    const executor = formatExecutor(auditEntry);

    // Tworzymy embed za pomocą nowej funkcji (łatwiejsze utrzymanie)
    const embed = createLogEmbed(
      "🏷️ Roles Updated",
      LOG_COLORS.SYSTEM,   // niebieski z logSystem
      `**Użytkownik:** ${newMember} (${newMember.user.tag})`,
      [
        { 
          name: "🆔 ID", 
          value: `\`${newMember.id}\``, 
          inline: true 
        },
        { 
          name: "🛠 Wykonano przez", 
          value: executor, 
          inline: true 
        },
        { 
          name: "➕ Dodane role", 
          value: formatRoleList(added, 900) || "Brak", 
          inline: false 
        },
        { 
          name: "➖ Usunięte role", 
          value: formatRoleList(removed, 900) || "Brak", 
          inline: false 
        }
      ],
      `Time: ${formatTime()}`
    );

    // Wysyłamy log
    const success = await sendLog(newMember.guild, LOGS.SYSTEM, embed);

    if (!success) {
      console.warn(`[ROLE UPDATE] Nie udało się wysłać loga dla ${newMember.user.tag}`);
    } else {
      console.log(`[ROLE UPDATE] Zalogowano zmianę ról dla ${newMember.user.tag}`);
    }
  }
};
