// src/events/banRemove.js
const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { 
  LOGS, 
  findAuditEntry, 
  formatExecutor, 
  clampText, 
  sendLog 
} = require("../systems/log");

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    // Zabezpieczenie przed brakującymi danymi
    if (!ban?.guild || !ban?.user) return;

    // Przeszukiwanie Audit Logs, aby sprawdzić, kto zdjął bana
    const auditEntry = await findAuditEntry(ban.guild, {
      type: AuditLogEvent.MemberBanRemove,
      match: (entry) => entry.target?.id === ban.user.id
    });

    const executor = formatExecutor(auditEntry);
    const reason = auditEntry?.reason || "No reason provided.";

    // Pobieranie czasu założenia konta (dla spójności z logiem banAdd)
    const createdUnix = Math.floor(ban.user.createdTimestamp / 1000);

    // Budowanie eleganckiego loga w barwach VYRN
    const embed = new EmbedBuilder()
      .setColor("#00FF7F") // THEME.SUCCESS (Sygnalizuje pomyślną akcję / zdjęcie kary)
      .setAuthor({ 
        name: "♻️ VYRN MODERATION • USER UNBANNED", 
        iconURL: ban.guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**A user's ban has been revoked. They can now rejoin the server.**`)
      .addFields(
        { name: "👤 User", value: `${ban.user} (\`${ban.user.tag}\`)`, inline: true },
        { name: "🆔 User ID", value: `\`${ban.user.id}\``, inline: true },
        { name: "👮 Unbanned By", value: executor, inline: true },
        { name: "📝 Reason", value: `>>> ${clampText(reason, 1024)}`, inline: false },
        { name: "📅 Account Created", value: `<t:${createdUnix}:R> (<t:${createdUnix}:f>)`, inline: false }
      )
      .setFooter({ text: "Official VYRN Log System" })
      .setTimestamp();

    // Wysyłanie na kanał z logami moderacyjnymi
    await sendLog(ban.guild, LOGS.MODERATION, embed);
  }
};
