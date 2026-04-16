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
    if (!messages?.size) return;

    const firstMessage = messages.first();
    const guild = firstMessage?.guild;
    const channel = firstMessage?.channel;

    if (!guild || !channel) return;

    const auditEntry = await findAuditEntry(guild, {
      type: AuditLogEvent.MessageBulkDelete,
      match: (entry) => {
        const sameChannel = entry.extra?.channel?.id === channel.id;
        const countMatches = typeof entry.extra?.count === "number"
          ? entry.extra.count >= messages.size
          : true;

        return sameChannel && countMatches;
      }
    });

    const previewLines = [...messages.values()]
      .filter((message) => !message.author?.bot)
      .slice(0, 6)
      .map((message) => {
        const author = message.author?.tag || "Unknown";
        const content = clampText(
          message.content ||
            (message.attachments?.size
              ? "[Attachment only]"
              : "[No cached content]"),
          120,
          "[No cached content]"
        );

        return `${author}: ${content}`;
      });

    const preview = clampText(
      previewLines.join("\n"),
      1000,
      "Unavailable. Bulk delete usually contains uncached messages."
    );

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("🧹 Messages Purged")
      .addFields(
        { name: "📍 Channel", value: `<#${channel.id}>`, inline: true },
        { name: "🧮 Count", value: String(messages.size), inline: true },
        { name: "🛠 Deleted By", value: formatExecutor(auditEntry), inline: true },
        { name: "📝 Preview", value: preview }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(guild, LOGS.CHAT, embed);
  }
};
