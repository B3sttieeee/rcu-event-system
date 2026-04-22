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
} = require("../utils/logSystem");

const getDeletedContent = (message) => {
  if (message.content) {
    return clampText(message.content, 1000, "No content");
  }
  if (message.attachments?.size) {
    return "📎 Attachment only";
  }
  if (message.embeds?.length) {
    return `📄 Embed only (${message.embeds.length})`;
  }
  if (message.stickers?.size) {
    return `🎨 Sticker only (${message.stickers.size})`;
  }
  return "Unavailable (message not cached)";
};

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;

    // Obsługa partial messages
    if (message.partial) {
      try {
        await message.fetch();
      } catch {
        return; // nie udało się pobrać – pomijamy
      }
    }

    // Pomijamy boty
    if (message.author?.bot) return;

    // Szukamy kto usunął wiadomość (audit log)
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

    const authorMention = message.author?.id ? `<@${message.author.id}>` : "Unknown";
    const authorTag = message.author?.tag || "Unknown User";

    // Tworzymy embed za pomocą ujednoliconej funkcji
    const embed = createLogEmbed(
      "🗑 Message Deleted",
      LOG_COLORS.CHAT || "#ef4444",   // czerwony/pomarańczowy dla moderacji chatu
      `**Wiadomość została usunięta**`,
      [
        {
          name: "👤 User",
          value: `${authorMention} (${authorTag})`,
          inline: true
        },
        {
          name: "🆔 Message ID",
          value: `\`${message.id}\``,
          inline: true
        },
        {
          name: "🛠 Deleted By",
          value: formatExecutor(auditEntry),
          inline: true
        },
        {
          name: "📍 Channel",
          value: message.channel?.id ? `<#${message.channel.id}>` : "Unknown",
          inline: false
        },
        {
          name: "💬 Content",
          value: getDeletedContent(message),
          inline: false
        }
      ],
      `Time: ${formatTime()}`
    );

    // Dodajemy załączniki jeśli istnieją
    const attachments = formatAttachments(message.attachments, 1000);
    if (attachments) {
      embed.addFields({
        name: "📎 Attachments",
        value: attachments,
        inline: false
      });
    }

    // Wysyłamy log
    const success = await sendLog(message.guild, LOGS.CHAT, embed);

    if (success) {
      console.log(`[MESSAGE DELETE] Zalogowano usunięcie wiadomości od ${authorTag}`);
    } else {
      console.warn(`[MESSAGE DELETE] Nie udało się wysłać loga dla ${authorTag}`);
    }
  }
};
