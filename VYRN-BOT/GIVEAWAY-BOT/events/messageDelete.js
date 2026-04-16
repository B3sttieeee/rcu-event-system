const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  formatTime,
  sendLog,
  findAuditEntry,
  formatExecutor,
  clampText,
  formatAttachments
} = require("../utils/logSystem");

const getDeletedContent = (message) => {
  if (message.content) {
    return clampText(message.content, 1000, "No content");
  }

  if (message.attachments?.size) {
    return "Attachment only";
  }

  if (message.embeds?.length) {
    return `Embed only (${message.embeds.length})`;
  }

  if (message.stickers?.size) {
    return `Sticker only (${message.stickers.size})`;
  }

  return "Unavailable (message not cached)";
};

module.exports = {
  name: Events.MessageDelete,

  async execute(message) {
    if (!message.guild) return;

    if (message.partial) {
      try {
        await message.fetch();
      } catch {}
    }

    if (message.author?.bot) return;

    const auditEntry = await findAuditEntry(message.guild, {
      type: AuditLogEvent.MessageDelete,
      match: (entry) => {
        if (!message.author?.id) return false;

        return (
          entry.target?.id === message.author.id &&
          entry.extra?.channel?.id === message.channel?.id
        );
      }
    });

    const authorTag = message.author?.tag || "Unknown User";
    const authorId = message.author?.id || "Unknown";
    const authorMention = message.author?.id ? `<@${message.author.id}>` : "Unknown";

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: authorTag,
        iconURL: message.author?.displayAvatarURL() || null
      })
      .setTitle("🗑 Message Deleted")
      .addFields(
        { name: "👤 User", value: authorMention, inline: true },
        { name: "🆔 ID", value: authorId, inline: true },
        { name: "🛠 Deleted By", value: formatExecutor(auditEntry), inline: true },
        {
          name: "📍 Channel",
          value: message.channel?.id ? `<#${message.channel.id}>` : "Unknown"
        },
        {
          name: "💬 Content",
          value: getDeletedContent(message)
        }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    const attachments = formatAttachments(message.attachments, 1000);

    if (attachments) {
      embed.addFields({
        name: "📎 Attachments",
        value: attachments
      });
    }

    await sendLog(message.guild, LOGS.CHAT, embed);
  }
};
