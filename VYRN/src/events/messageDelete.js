// src/events/messageDelete.js
const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { 
  LOGS, 
  sendLog, 
  findAuditEntry, 
  formatExecutor, 
  clampText 
} = require("../systems/log");

// Pomocnicza funkcja sprawdzająca zawartość wiadomości
const getDeletedContent = (message) => {
  if (message.content) return clampText(message.content, 1000);
  if (message.attachments?.size) return "*[Contains Attachments Only]*";
  if (message.embeds?.length) return `*[Contains ${message.embeds.length} Embed(s) Only]*`;
  if (message.stickers?.size) return `*[Contains ${message.stickers.size} Sticker(s) Only]*`;
  return "*[Unavailable or Empty]*";
};

module.exports = {
  name: Events.MessageDelete,
  
  async execute(message) {
    if (!message.guild) return;
    
    // Jeśli wiadomość była za stara (partial), próbujemy ją pobrać z cache Discorda
    if (message.partial) {
      try { await message.fetch(); } catch { return; }
    }
    
    // Ignorujemy wiadomości usuwane przez boty (żeby nie robić spamu w logach)
    if (message.author?.bot) return;

    // Przeszukiwanie Audit Logs, aby sprawdzić, czy usunął to Admin
    const auditEntry = await findAuditEntry(message.guild, {
      type: AuditLogEvent.MessageDelete,
      match: (entry) => entry.target?.id === message.author.id && 
                        entry.extra?.channel?.id === message.channel?.id
    });

    // Jeśli nie ma wpisu w audycie -> gracz najpewniej usunął to sam.
    const executor = auditEntry 
      ? formatExecutor(auditEntry) 
      : `${message.author} (Self-Delete)`;

    // Budowanie prestiżowego Embedu (Kolor Czerwony / DANGER)
    const embed = new EmbedBuilder()
      .setColor("#ff4757") 
      .setAuthor({ 
        name: "🗑️ VYRN LOG • MESSAGE DELETED", 
        iconURL: message.guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(`**A message has been removed from the chat.**`)
      .addFields(
        { name: "👤 Author", value: `${message.author} (\`${message.author.tag}\`)`, inline: true },
        { name: "📍 Channel", value: `${message.channel}`, inline: true },
        { name: "👮 Deleted By", value: executor, inline: true },
        { name: "💬 Content", value: `>>> ${getDeletedContent(message)}`, inline: false }
      )
      .setFooter({ text: `Message ID: ${message.id} • Official VYRN System` })
      .setTimestamp();

    // Dodawanie listy linków do załączników (jeśli były jakieś zdjęcia/pliki)
    if (message.attachments?.size) {
      const attachmentUrls = [...message.attachments.values()].map(a => a.url).join("\n");
      embed.addFields({ name: "📎 Attachments (URLs)", value: clampText(attachmentUrls, 1024) });
    }

    // Wysłanie loga na kanał z moderacją czatu
    await sendLog(message.guild, LOGS.CHAT, embed);
  }
};
