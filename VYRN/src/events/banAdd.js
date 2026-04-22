// src/events/banAdd.js
const { Events, AuditLogEvent } = require("discord.js");
const { 
  LOGS, 
  LOG_COLORS, 
  formatTime, 
  sendLog, 
  findAuditEntry, 
  formatExecutor, 
  clampText, 
  createLogEmbed 
} = require("../systems/log");

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    if (!ban?.guild || !ban?.user) return;

    const auditEntry = await findAuditEntry(ban.guild, {
      type: AuditLogEvent.MemberBanAdd,
      match: (entry) => entry.target?.id === ban.user.id
    });

    const executor = formatExecutor(auditEntry);
    const reason = ban.reason || auditEntry?.reason || null;

    const embed = createLogEmbed(
      "🔨 User Banned",
      LOG_COLORS.MODERATION,
      `**Użytkownik został zbanowany**`,
      [
        { name: "👤 User", value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
        { name: "🆔 ID", value: `\`${ban.user.id}\``, inline: true },
        { name: "🛠 Banned by", value: executor, inline: true },
      ],
      `Time: ${formatTime()}`
    );

    if (reason) {
      embed.addFields({ name: "📝 Reason", value: clampText(reason, 1024, "No reason provided") });
    }

    await sendLog(ban.guild, LOGS.MODERATION, embed);
  }
};
