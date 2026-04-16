const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

const trimText = (text, limit = 1000) => {
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
};

const formatAttachments = (message) => {
  if (!message.attachments?.size) return null;

  const text = [...message.attachments.values()]
    .map((attachment) => attachment.url)
    .join("\n");

  return trimText(text, 1000);
};

module.exports = {
  name: Events.MessageDelete,

  async execute(message) {
    if (!message.guild) return;

    if (message.partial) {
      try {
        await message.fetch();
      } catch {
        return;
      }
    }

    if (!message.author || message.author.bot) return;

    let executor = "Unknown";

    try {
      const logs = await message.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MessageDelete
      });

      const entry = logs.entries.find(
        (log) =>
          log.target?.id === message.author.id &&
          log.extra?.channel?.id === message.channel.id &&
          Date.now() - log.createdTimestamp < 15000
      );

      if (entry?.executor) {
        executor = `<@${entry.executor.id}>`;
      }
    } catch {}

    const content = trimText(message.content, 1000) || "No content";
    const attachments = formatAttachments(message);

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      })
      .setTitle("🗑 Message Deleted")
      .addFields(
        { name: "👤 User", value: `<@${message.author.id}>`, inline: true },
        { name: "🛠 Deleted By", value: executor, inline: true },
        { name: "📍 Channel", value: `<#${message.channel.id}>` },
        { name: "💬 Content", value: content }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    if (attachments) {
      embed.addFields({ name: "📎 Attachments", value: attachments });
    }

    await sendLog(message.guild, LOGS.CHAT, embed);
  }
};
