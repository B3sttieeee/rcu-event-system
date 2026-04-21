const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  clampText
} = require("../utils/logSystem");

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages) {
    if (!messages?.size || messages.size < 1) return;

    const firstMessage = messages.first();
    const guild = firstMessage?.guild;
    const channel = firstMessage?.channel;

    if (!guild || !channel) return;

    // Szukamy wpisu w Audit Log (z lepszą tolerancją)
    const auditEntry = await findAuditEntry(guild, {
      type: AuditLogEvent.MessageBulkDelete,
      match: (entry) => {
        const sameChannel = entry.extra?.channel?.id === channel.id;
        // Zwiększamy tolerancję - akceptujemy nawet mniejszą liczbę w logu
        const countMatches = typeof entry.extra?.count === "number"
          ? Math.abs(entry.extra.count - messages.size) <= 5   // tolerancja ±5
          : true;
        return sameChannel && countMatches;
      },
      limit: 10,        // szukamy głębiej
      timeout: 3000     // czekamy dłużej
    });

    // Przygotowanie preview
    const previewLines = [...messages.values()]
      .filter((message) => !message.author?.bot)
      .slice(0, 8) // więcej wiadomości w preview
      .map((message) => {
        const author = message.author?.tag || "Unknown";
        const content = clampText(
          message.content || 
          (message.attachments?.size ? "[Attachment]" : "[No content]"),
          100,
          "[No cached content]"
        );
        return `**${author}:** ${content}`;
      });

    const preview = previewLines.length 
      ? clampText(previewLines.join("\n"), 950, "")
      : "No cached messages available.";

    // Główny embed
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🧹 Bulk Messages Deleted")
      .addFields(
        { name: "📍 Channel", value: `<#${channel.id}>`, inline: true },
        { name: "🧮 Deleted", value: `**${messages.size}** messages`, inline: true },
        { 
          name: "🛠 Deleted By", 
          value: formatExecutor(auditEntry) || "**Unknown / Not logged**", 
          inline: true 
        },
        { 
          name: "📝 Preview", 
          value: preview || "*No preview available*" 
        }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(guild, LOGS.CHAT, embed);

    // Opcjonalnie: dodatkowy log jeśli nie znaleziono autora
    if (!auditEntry) {
      console.log(`[BULK DELETE] No audit entry found for ${messages.size} messages in #${channel.name}`);
    }
  }
};
