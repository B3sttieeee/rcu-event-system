// src/events/banAdd.js
const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { 
  LOGS, 
  findAuditEntry, 
  formatExecutor, 
  clampText, 
  sendLog 
} = require("../systems/log");

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    // Zabezpieczenie przed brakiem danych
    if (!ban?.guild || !ban?.user) return;

    // Przeszukiwanie Audit Logs, aby dowiedzieć się KTO zbanował gracza
    const auditEntry = await findAuditEntry(ban.guild, {
      type: AuditLogEvent.MemberBanAdd,
      match: (entry) => entry.target?.id === ban.user.id
    });

    const executor = formatExecutor(auditEntry);
    const reason = ban.reason || auditEntry?.reason || "No reason provided.";
    
    // Pobieranie czasu założenia konta (pomaga wyłapać boty/multikonta)
    const createdUnix = Math.floor(ban.user.createdTimestamp / 1000);

    // Prestiżowy i czytelny Embed w stylu VYRN
    const embed = new EmbedBuilder()
      .setColor("#ff4757") // THEME.DANGER (Czerwony, sygnalizujący bana)
      .setAuthor({ 
          name: "🔨 VYRN MODERATION • USER BANNED", 
          iconURL: ban.guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**A user has been permanently removed from the server.**`)
      .addFields(
        { name: "👤 User", value: `${ban.user} (\`${ban.user.tag}\`)`, inline: true },
        { name: "🆔 User ID", value: `\`${ban.user.id}\``, inline: true },
        { name: "👮 Banned By", value: executor, inline: true },
        { name: "📝 Reason", value: `>>> ${clampText(reason, 1024)}`, inline: false },
        { name: "📅 Account Created", value: `<t:${createdUnix}:R> (<t:${createdUnix}:f>)`, inline: false }
      )
      .setFooter({ text: "Official VYRN Log System" })
      .setTimestamp();

    // Wysłanie loga na kanał moderacyjny
    await sendLog(ban.guild, LOGS.MODERATION, embed);
  }
};
