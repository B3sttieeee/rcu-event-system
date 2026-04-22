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
  name: Events.GuildBanAdd,
  async execute(ban) {
    if (!ban?.guild || !ban?.user) return;

    // Szukamy wpisu w audit logach (kto zbanował)
    const auditEntry = await findAuditEntry(ban.guild, {
      type: AuditLogEvent.MemberBanAdd,
      match: (entry) => entry.target?.id === ban.user.id
    });

    const executor = formatExecutor(auditEntry);
    const reason = ban.reason || auditEntry?.reason || null;

    // Tworzymy embed za pomocą ujednoliconej funkcji
    const embed = createLogEmbed(
      "🔨 User Banned",
      LOG_COLORS.MODERATION || "#ef4444",   // pomarańczowo-czerwony kolor moderacji
      `**Użytkownik został zbanowany**`,
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
          name: "🛠 Banned by",
          value: executor,
          inline: true
        }
      ],
      `Time: ${formatTime()}`
    );

    // Dodajemy powód, jeśli istnieje
    if (reason) {
      embed.addFields({
        name: "📝 Reason",
        value: clampText(reason, 1024, "No reason provided"),
        inline: false
      });
    }

    // Wysyłamy log
    const success = await sendLog(ban.guild, LOGS.SYSTEM, embed);   // lub LOGS.MODERATION jeśli masz osobny kanał

    if (success) {
      console.log(`[BAN ADD] Zalogowano bana użytkownika ${ban.user.tag}`);
    } else {
      console.warn(`[BAN ADD] Nie udało się wysłać loga bana dla ${ban.user.tag}`);
    }
  }
};
