// src/events/messageDeleteBulk.js
const { Events, AuditLogEvent, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { 
  LOGS, 
  sendLog, 
  findAuditEntry, 
  formatExecutor, 
  clampText 
} = require("../systems/log");

module.exports = {
  name: Events.MessageBulkDelete,

  async execute(messages) {
    if (!messages?.size || messages.size < 2) return;

    const firstMessage = messages.first();
    const guild = firstMessage?.guild;
    const channel = firstMessage?.channel;
    if (!guild || !channel) return;

    // Przeszukiwanie Audit Logs, aby znaleźć sprawcę czyszczenia czatu
    const auditEntry = await findAuditEntry(guild, {
      type: AuditLogEvent.MessageBulkDelete,
      limit: 10,
      maxAge: 20_000,
      match: (entry) => {
        const sameChannel = entry.extra?.channel?.id === channel.id;
        const countMatches = typeof entry.extra?.count === "number" 
          ? Math.abs(entry.extra.count - messages.size) <= 10 
          : true;
        return sameChannel && countMatches;
      }
    });

    const executor = formatExecutor(auditEntry);

    // 1. Podgląd wiadomości (Preview) dla Embedu
    const previewLines = [...messages.values()]
      .reverse() // Sortujemy od najstarszej
      .slice(0, 10) // Pokazujemy max 10 w podglądzie
      .map(msg => {
        const author = msg.author?.tag || "Unknown User";
        const content = clampText(msg.content, 80, "[No content/Image]");
        return `\`${author}:\` ${content}`;
      });

    const preview = previewLines.length 
      ? previewLines.join("\n") 
      : "No cached content available for preview.";

    // 2. Pełny Transkrypt (Do pliku .txt)
    const transcriptLines = [...messages.values()]
      .reverse()
      .map(msg => {
        const time = msg.createdAt.toLocaleString();
        const author = msg.author?.tag || "Unknown User";
        const content = msg.content || "[No text content]";
        return `[${time}] ${author} (${msg.author?.id || "N/A"}): ${content}`;
      });

    const transcriptBuffer = Buffer.from(transcriptLines.join("\n"), "utf-8");
    const attachment = new AttachmentBuilder(transcriptBuffer, { name: `bulk-delete-${channel.name}.txt` });

    // 3. Budowanie Prestiżowego Embedu
    const embed = new EmbedBuilder()
      .setColor("#ff4757") // THEME.DANGER
      .setAuthor({ 
        name: "🧹 VYRN LOG • BULK MESSAGES DELETED", 
        iconURL: guild.iconURL({ dynamic: true }) 
      })
      .setDescription(`**Massive cleanup in channel:** ${channel}`)
      .addFields(
        { name: "🧮 Amount", value: `\`${messages.size}\` messages`, inline: true },
        { name: "👮 Deleted By", value: executor, inline: true },
        { name: "📍 Channel ID", value: `\`${channel.id}\``, inline: true },
        { name: "📝 Preview (Last 10 msgs)", value: `>>> ${clampText(preview, 1000)}`, inline: false }
      )
      .setFooter({ text: "A full transcript has been generated and attached below." })
      .setTimestamp();

    // Wysłanie loga wraz z załącznikiem .txt
    const logChannel = await guild.channels.fetch(LOGS.CHAT).catch(() => null);
    if (logChannel) {
      await logChannel.send({ embeds: [embed], files: [attachment] }).catch(console.error);
    }
  }
};
