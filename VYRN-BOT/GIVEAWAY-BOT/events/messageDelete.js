const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.MessageDelete,

  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    if (message.partial) {
      try { await message.fetch(); } catch { return; }
    }

    let executor = "Unknown";

    try {
      const logs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MessageDelete
      });

      const log = logs.entries.first();
      if (log && log.target.id === message.author.id) {
        executor = `<@${log.executor.id}>`;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle("🗑 Message Deleted")

      .addFields(
        { name: "👤 User", value: `<@${message.author.id}>`, inline: true },
        { name: "🛠 Deleted By", value: executor, inline: true },
        { name: "📍 Channel", value: `<#${message.channel.id}>` },
        {
          name: "💬 Content",
          value: message.content?.slice(0, 1000) || "No content"
        }
      )

      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(message.guild, LOGS.CHAT, embed);
  }
};
