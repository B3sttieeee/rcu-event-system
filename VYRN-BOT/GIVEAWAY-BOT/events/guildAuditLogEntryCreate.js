const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  LOGS,
  formatTime,
  sendLog,
  clampText
} = require("../utils/logSystem");

const IGNORED_ACTIONS = new Set([
  AuditLogEvent.MemberKick,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
  AuditLogEvent.MemberRoleUpdate,
  AuditLogEvent.MessageDelete,
  AuditLogEvent.MessageBulkDelete
]);

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
  [AuditLogEvent.StickerCreate]: "🧩 Sticker Created",
  [AuditLogEvent.StickerUpdate]: "🧩 Sticker Updated",
  [AuditLogEvent.StickerDelete]: "🧩 Sticker Deleted",
  [AuditLogEvent.WebhookCreate]: "🪝 Webhook Created",
  [AuditLogEvent.WebhookUpdate]: "🪝 Webhook Updated",
  [AuditLogEvent.WebhookDelete]: "🪝 Webhook Deleted",
  [AuditLogEvent.InviteCreate]: "🔗 Invite Created",
  [AuditLogEvent.InviteUpdate]: "🔗 Invite Updated",
  [AuditLogEvent.InviteDelete]: "🔗 Invite Deleted",
  [AuditLogEvent.ThreadCreate]: "🧵 Thread Created",
  [AuditLogEvent.ThreadUpdate]: "🧵 Thread Updated",
  [AuditLogEvent.ThreadDelete]: "🧵 Thread Deleted",
  [AuditLogEvent.BotAdd]: "🤖 Bot Added"
};

const formatTarget = (target) => {
  if (!target) return "Unknown";

  if (target.id && target.username) return `<@${target.id}>`;
  if (target.id && target.permissions !== undefined) return `<@&${target.id}>`;
  if (target.id && target.type !== undefined) return `<#${target.id}>`;
  if (target.code) return `\`${target.code}\``;
  if (target.name && target.id) return `\`${target.name}\` (${target.id})`;
  if (target.name) return `\`${target.name}\``;
  if (target.id) return `\`${target.id}\``;

  return "Unknown";
};

module.exports = {
  name: Events.GuildAuditLogEntryCreate,

  async execute(entry, guild) {
    if (IGNORED_ACTIONS.has(entry.action)) return;

    const title = ACTION_LABELS[entry.action] || `⚙️ Audit Action ${entry.action}`;
    const executor = entry.executor ? `<@${entry.executor.id}>` : "Unknown";
    const target = formatTarget(entry.target);
    const reason = entry.reason ? clampText(entry.reason, 1024, null) : null;
    const changes = entry.changes?.length
      ? clampText(entry.changes.map((change) => change.key).join(", "), 1024, null)
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

    if (reason) {
      embed.addFields({ name: "📝 Reason", value: reason });
    }

    if (changes) {
      embed.addFields({ name: "🧩 Changes", value: changes });
    }

    await sendLog(guild, LOGS.SYSTEM, embed);
  }
};
