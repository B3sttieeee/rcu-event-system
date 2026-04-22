// src/events/messageDelete.js
const { Events, AuditLogEvent } = require("discord.js");
const { 
  LOGS, 
  LOG_COLORS, 
  formatTime, 
  sendLog, 
  findAuditEntry, 
  formatExecutor, 
  clampText, 
  formatAttachments, 
  createLogEmbed 
} = require("../systems/log");

const getDeletedContent = (message) => {
  if (message.content) return clampText(message.content, 1000, "No content");
  if (message.attachments?.size) return "📎 Attachment only";
  if (message.embeds?.length) return `📄 Embed only (${message.embeds.length})`;
  if (message.stickers?.size) return `🎨 Sticker only (${message.stickers.size})`;
  return "Unavailable (message not cached)";
};

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;
    if (message.partial) {
      try { await message.fetch(); } catch { return; }
    }
    if (message.author?.bot) return;

    const auditEntry = await findAuditEntry(message.guild, {
      type: AuditLogEvent.MessageDelete,
      match: (entry) => entry.target?.id === message.author.id && 
                       entry.extra?.channel?.id === message.channel?.id
    });

    const embed = createLogEmbed(
      "🗑 Message Deleted",
      LOG_COLORS.CHAT,
      `**Wiadomość została usunięta**`,
      [
        { name: "👤 User", value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: "🆔 Message ID", value: `\`${message.id}\``, inline: true },
        { name: "🛠 Deleted By", value: formatExecutor(auditEntry), inline: true },
        { name: "📍 Channel", value: `<#${message.channel.id}>`, inline: false },
        { name: "💬 Content", value: getDeletedContent(message), inline: false },
      ],
      `Time: ${formatTime()}`
    );

    if (message.attachments?.size) {
      const attachments = formatAttachments(message.attachments);
      if (attachments) embed.addFields({ name: "📎 Attachments", value: attachments });
    }

    await sendLog(message.guild, LOGS.CHAT, embed);
  }
};
