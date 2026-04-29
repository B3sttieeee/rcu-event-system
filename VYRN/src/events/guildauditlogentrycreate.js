// src/events/auditLog.js
const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { LOGS, sendLog, clampText } = require("../systems/log");

// ====================== CONFIG & LABELS ======================
// Mapowanie akcji na odpowiednie ikony, nazwy i dynamiczne kolory
const ACTION_MAP = {
  [AuditLogEvent.ChannelCreate]: { label: "📁 Channel Created", color: "#00FF7F" },
  [AuditLogEvent.ChannelUpdate]: { label: "🛠 Channel Updated", color: "#3b82f6" },
  [AuditLogEvent.ChannelDelete]: { label: "🗑 Channel Deleted", color: "#ff4757" },
  
  [AuditLogEvent.RoleCreate]:    { label: "🏷 Role Created", color: "#00FF7F" },
  [AuditLogEvent.RoleUpdate]:    { label: "🛠 Role Updated", color: "#3b82f6" },
  [AuditLogEvent.RoleDelete]:    { label: "🗑 Role Deleted", color: "#ff4757" },
  
  [AuditLogEvent.EmojiCreate]:   { label: "😀 Emoji Created", color: "#00FF7F" },
  [AuditLogEvent.EmojiUpdate]:   { label: "😀 Emoji Updated", color: "#3b82f6" },
  [AuditLogEvent.EmojiDelete]:   { label: "🗑 Emoji Deleted", color: "#ff4757" },
  
  [AuditLogEvent.WebhookCreate]: { label: "🪝 Webhook Created", color: "#00FF7F" },
  [AuditLogEvent.WebhookUpdate]: { label: "🪝 Webhook Updated", color: "#3b82f6" },
  [AuditLogEvent.WebhookDelete]: { label: "🗑 Webhook Deleted", color: "#ff4757" },
  
  [AuditLogEvent.InviteCreate]:  { label: "🔗 Invite Created", color: "#00FF7F" },
  [AuditLogEvent.InviteDelete]:  { label: "🗑 Invite Deleted", color: "#ff4757" },
  
  [AuditLogEvent.ThreadCreate]:  { label: "🧵 Thread Created", color: "#00FF7F" },
  [AuditLogEvent.ThreadUpdate]:  { label: "🧵 Thread Updated", color: "#3b82f6" },
  [AuditLogEvent.ThreadDelete]:  { label: "🗑 Thread Deleted", color: "#ff4757" },
  
  [AuditLogEvent.BotAdd]:        { label: "🤖 Bot Added", color: "#FFD700" } // Złoty alert dla nowych botów
};

module.exports = {
  name: Events.GuildAuditLogEntryCreate,

  async execute(entry, guild) {
    try {
      // Jeśli akcja nie jest na naszej liście, ignorujemy ją (lub oznaczamy jako systemową)
      const actionData = ACTION_MAP[entry.action];
      if (!actionData) return; 

      const executor = entry.executor ? `<@${entry.executor.id}> (\`${entry.executor.tag}\`)` : "Unknown System/Bot";

      // Inteligentne formatowanie Celu (Target) w zależności od jego typu
      let targetFormat = `\`${entry.target?.id || "Unknown"}\``;
      if (entry.target) {
        if (entry.action >= 10 && entry.action <= 12) targetFormat = `<#${entry.target.id}>`; // Kanały
        if (entry.action >= 30 && entry.action <= 32) targetFormat = `<@&${entry.target.id}>`; // Role
        if (entry.action >= 20 && entry.action <= 22) targetFormat = `<@${entry.target.id}>`; // User / Bot
      }

      // Formatowanie powodu
      const reason = entry.reason ? clampText(entry.reason, 1024) : null;

      // Profesjonalne formatowanie zmian: "Klucz: Stare -> Nowe"
      let changesText = null;
      if (entry.changes && entry.changes.length > 0) {
        const mappedChanges = entry.changes.map(c => {
          const oldVal = c.old !== undefined && c.old !== null ? String(c.old) : "None";
          const newVal = c.new !== undefined && c.new !== null ? String(c.new) : "None";
          return `**${c.key}**: \`${oldVal}\` ➔ \`${newVal}\``;
        }).join("\n");
        changesText = clampText(mappedChanges, 1024);
      }

      // Budowanie prestiżowego Embedu
      const embed = new EmbedBuilder()
        .setColor(actionData.color)
        .setAuthor({ 
            name: `⚙️ VYRN SYSTEM • ${actionData.label}`, 
            iconURL: guild.iconURL({ dynamic: true }) 
        })
        .addFields(
          { name: "👮 Executor", value: executor, inline: true },
          { name: "🎯 Target", value: targetFormat, inline: true },
          { name: "🆔 Action ID", value: `\`${entry.action}\``, inline: true }
        )
        .setFooter({ text: "Official VYRN Log System" })
        .setTimestamp();

      if (reason) embed.addFields({ name: "📝 Reason", value: `>>> ${reason}` });
      if (changesText) embed.addFields({ name: "🧩 Modifications", value: changesText });

      // Wysyłanie loga na kanał SYSTEMOWY
      await sendLog(guild, LOGS.SYSTEM, embed);

    } catch (err) {
      console.error("🔥 [AUDIT LOG ERROR]", err);
    }
  }
};
