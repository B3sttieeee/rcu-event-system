// src/events/roleUpdate.js
const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { 
  LOGS, 
  sendLog, 
  findAuditEntry, 
  formatExecutor, 
  formatRoleList 
} = require("../systems/log");

module.exports = {
  name: Events.GuildMemberUpdate,
  
  async execute(oldMember, newMember) {
    // Obliczanie różnicy w rolach
    const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    // Jeśli role się nie zmieniły (np. zmiana nicku), ignorujemy
    if (!added.size && !removed.size) return;

    // Przeszukiwanie Audit Logs, aby sprawdzić sprawcę zmiany
    const auditEntry = await findAuditEntry(newMember.guild, {
      type: AuditLogEvent.MemberRoleUpdate,
      match: (entry) => entry.target?.id === newMember.id
    });

    const executor = formatExecutor(auditEntry);

    // Budowanie prestiżowego Embedu w barwach VYRN
    const embed = new EmbedBuilder()
      .setColor("#3b82f6") // THEME.BLUE
      .setAuthor({ 
        name: "🏷️ VYRN SYSTEM • MEMBER ROLES UPDATED", 
        iconURL: newMember.guild.iconURL({ dynamic: true }) 
      })
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**User:** ${newMember} (\`${newMember.user.tag}\`)`)
      .addFields(
        { name: "🆔 User ID", value: `\`${newMember.id}\``, inline: true },
        { name: "👮 Managed By", value: executor, inline: true }
      )
      .setFooter({ text: "Official VYRN Log System" })
      .setTimestamp();

    // Sekcja DODANYCH ról
    if (added.size > 0) {
      embed.addFields({ 
        name: "➕ Roles Added", 
        value: `>>> ${formatRoleList(added, 1000)}`, 
        inline: false 
      });
    }

    // Sekcja USUNIĘTYCH ról
    if (removed.size > 0) {
      embed.addFields({ 
        name: "➖ Roles Removed", 
        value: `>>> ${formatRoleList(removed, 1000)}`, 
        inline: false 
      });
    }

    // Wysłanie loga na kanał SYSTEMOWY
    await sendLog(newMember.guild, LOGS.SYSTEM, embed);
  }
};
