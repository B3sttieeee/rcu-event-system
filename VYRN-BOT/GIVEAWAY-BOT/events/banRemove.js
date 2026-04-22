const { Events, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  LOG_COLORS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  clampText,
  createLogEmbed
} = require("../utils/logSystem");

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    if (!ban?.guild || !ban?.user) return;

    // Szukamy wpisu w audit logach (kto odbanował)
    const auditEntry = await findAuditEntry(ban.guild, {
      type: AuditLogEvent.MemberBanRemove,
      match: (entry) => entry.target?.id === ban.user.id
    });

    const executor = formatExecutor(auditEntry);
    const reason = auditEntry?.reason || null;

    // Tworzymy embed za pomocą ujednoliconej funkcji
    const embed = createLogEmbed(
      "♻️ User Unbanned",
      LOG_COLORS.JOIN_LEAVE || "#22c55e",   // zielony – pozytywna akcja
      `**Użytkownik został odbanowany**`,
      [
        {
          name: "👤 User",
          value: `<@${ban.user.id}> (${ban.user.tag})`,
          inline: true
        },
        {
          name: "🆔 ID",
          value: `\`${ban.user.id}\``,
          inline: true
        },
        {
          name: "🛠 Unbanned by",
          value: executor,
          inline: true
        }
      ],
      `Time: ${formatTime()}`
    );

    // Dodajemy powód odbanowania (jeśli istnieje)
    if (reason) {
      embed.addFields({
        name: "📝 Reason",
        value: clampText(reason, 1024, "No reason provided"),
        inline: false
      });
    }

    // Wysyłamy log
    const success = await sendLog(ban.guild, LOGS.SYSTEM, embed);

    if (success) {
      console.log(`[BAN REMOVE] Zalogowano odbanowanie użytkownika ${ban.user.tag}`);
    } else {
      console.warn(`[BAN REMOVE] Nie udało się wysłać loga odbanowania dla ${ban.user.tag}`);
    }
  }
};
