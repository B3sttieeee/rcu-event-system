// src/events/messagedeletebulk.js
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
} = require("../systems/log");

module.exports = {
  name: Events.MessageBulkDelete,
  async execute(messages) {
    if (!messages?.size || messages.size < 2) return;

    const firstMessage = messages.first();
    const guild = firstMessage?.guild;
    const channel = firstMessage?.channel;
    if (!guild || !channel) return;

    const auditEntry = await findAuditEntry(guild, {
      type: AuditLogEvent.MessageBulkDelete,
      limit: 10,
      maxAge: 20_000,
      match: (entry) => {
        const sameChannel = entry.extra?.channel?.id === channel.id;
        const countMatches = typeof entry.extra?.count === "number" 
          ? Math.abs(entry.extra.count - messages.size) <= 8 
          : true;
        return sameChannel && countMatches;
      }
    });

    const previewLines = [...messages.values()]
      .filter(msg => !msg.author?.bot && msg.content)
      .slice(0, 8)
      .map(msg => {
        const author = msg.author?.tag || "Unknown";
        const content = clampText(msg.content, 90, "[No content]");
        return `**${author}:** ${content}`;
      });

    const preview = previewLines.length 
      ? clampText(previewLines.join("\n"), 950, "No cached content available.") 
      : "No cached messages available.";

    const embed = createLogEmbed(
      "🧹 Bulk Messages Deleted",
      LOG_COLORS.CHAT,
      `**Zbiorcze usunięcie wiadomości**`,
      [
        { name: "📍 Channel", value: `<#${channel.id}>`, inline: true },
        { name: "🧮 Amount", value: `**${messages.size}** messages`, inline: true },
        { name: "🛠 Deleted By", value: formatExecutor(auditEntry) || "**Unknown / Not in audit logs**", inline: true },
        { name: "📝 Preview", value: preview, inline: false },
      ],
      `Time: ${formatTime()}`
    );

    await sendLog(guild, LOGS.CHAT, embed);
  }
};
