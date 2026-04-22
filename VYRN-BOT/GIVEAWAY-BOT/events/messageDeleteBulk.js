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
  name: Events.MessageBulkDelete,
  async execute(messages) {
    if (!messages?.size || messages.size < 2) return; // ignorujemy pojedyncze usunięcia

    const firstMessage = messages.first();
    const guild = firstMessage?.guild;
    const channel = firstMessage?.channel;

    if (!guild || !channel) return;

    // Szukamy wpisu w Audit Log z większą tolerancją
    const auditEntry = await findAuditEntry(guild, {
      type: AuditLogEvent.MessageBulkDelete,
      limit: 10,
      maxAge: 20_000, // 20 sekund – więcej czasu na znalezienie
      match: (entry) => {
        const sameChannel = entry.extra?.channel?.id === channel.id;
        const countMatches = typeof entry.extra?.count === "number"
          ? Math.abs(entry.extra.count - messages.size) <= 8 // większa tolerancja
          : true;
        return sameChannel && countMatches;
      }
    });

    // Przygotowanie preview (max 8 wiadomości, bez botów)
    const previewLines = [...messages.values()]
      .filter((msg) => !msg.author?.bot && msg.content)
      .slice(0, 8)
      .map((msg) => {
        const author = msg.author?.tag || "Unknown";
        const content = clampText(msg.content, 90, "[No content]");
        return `**${author}:** ${content}`;
      });

    const preview = previewLines.length
      ? clampText(previewLines.join("\n"), 950, "No cached content available.")
      : "No cached messages available.";

    // Tworzymy embed za pomocą ujednoliconej funkcji
    const embed = createLogEmbed(
      "🧹 Bulk Messages Deleted",
      LOG_COLORS.CHAT || "#ef4444",
      `**Zbiorcze usunięcie wiadomości**`,
      [
        {
          name: "📍 Channel",
          value: `<#${channel.id}>`,
          inline: true
        },
        {
          name: "🧮 Amount",
          value: `**${messages.size}** messages`,
          inline: true
        },
        {
          name: "🛠 Deleted By",
          value: formatExecutor(auditEntry) || "**Unknown / Not in audit logs**",
          inline: true
        },
        {
          name: "📝 Preview",
          value: preview,
          inline: false
        }
      ],
      `Time: ${formatTime()}`
    );

    // Wysyłamy log
    const success = await sendLog(guild, LOGS.CHAT, embed);

    if (success) {
      console.log(`[BULK DELETE] Zalogowano usunięcie ${messages.size} wiadomości w #${channel.name}`);
    } else {
      console.warn(`[BULK DELETE] Nie udało się wysłać loga dla ${messages.size} wiadomości`);
    }

    // Dodatkowa informacja w konsoli gdy nie znaleziono audit entry
    if (!auditEntry) {
      console.log(`[BULK DELETE] Audit entry not found for ${messages.size} messages in #${channel.name}`);
    }
  }
};
