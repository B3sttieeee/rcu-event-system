const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { LOGS, formatTime, sendLog, clampText } = require("../systems/log");

const ACTION_LABELS = {
  [AuditLogEvent.ChannelCreate]: "📁 Channel Created",
  [AuditLogEvent.ChannelUpdate]: "🛠 Channel Updated",
  [AuditLogEvent.ChannelDelete]: "🗑 Channel Deleted",
  [AuditLogEvent.RoleCreate]: "🏷 Role Created",
  [AuditLogEvent.RoleUpdate]: "🛠 Role Updated",
  [AuditLogEvent.RoleDelete]: "🗑 Role Deleted",
  [AuditLogEvent.EmojiCreate]: "😀 Emoji Created",
  [AuditLogEvent.EmojiUpdate]: "😀 Emoji Updated",
  [AuditLogEvent.EmojiDelete]: "😀 Emoji Deleted",
  [AuditLogEvent.WebhookCreate]: "🪝 Webhook Created",
  [AuditLogEvent.WebhookUpdate]: "🪝 Webhook Updated",
  [AuditLogEvent.WebhookDelete]: "🪝 Webhook Deleted",
  [AuditLogEvent.InviteCreate]: "🔗 Invite Created",
  [AuditLogEvent.InviteDelete]: "🔗 Invite Deleted",
  [AuditLogEvent.ThreadCreate]: "🧵 Thread Created",
  [AuditLogEvent.ThreadUpdate]: "🧵 Thread Updated",
  [AuditLogEvent.ThreadDelete]: "🧵 Thread Deleted",
  [AuditLogEvent.BotAdd]: "🤖 Bot Added"
};

module.exports = {
  name: Events.GuildAuditLogEntryCreate,

  async execute(entry, guild) {
    try {
      const title =
        ACTION_LABELS[entry.action] || `⚙️ Audit Action ${entry.action}`;

      const executor = entry.executor
        ? `<@${entry.executor.id}>`
        : "Unknown";

      const target = entry.target
        ? (entry.target.id ? `\`${entry.target.id}\`` : "Unknown")
        : "Unknown";

      const reason = entry.reason
        ? clampText(entry.reason, 1024)
        : null;

      const changes = entry.changes?.length
        ? clampText(entry.changes.map(c => `${c.key}: ${c.new ?? "?"}`).join(", "), 1024)
        : null;

      const embed = new EmbedBuilder()
        .setColor("#64748b")
        .setTitle(title)
        .addFields(
          { name: "🛠 By", value: executor, inline: true },
          { name: "🎯 Target", value: target, inline: true },
          { name: "🆔 Action", value: String(entry.action), inline: true }
        )
        .setFooter({ text: `Time: ${formatTime()}` })
        .setTimestamp();

      if (reason) embed.addFields({ name: "📝 Reason", value: reason });
      if (changes) embed.addFields({ name: "🧩 Changes", value: changes });

      await sendLog(guild, LOGS.SYSTEM, embed);

    } catch (err) {
      console.error("[AUDIT LOG ERROR]", err);
    }
  }
};
