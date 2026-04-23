// src/events/guildmemberremove.js
const { EmbedBuilder, Events } = require("discord.js");
const { 
  LOGS, 
  LOG_COLORS, 
  formatTime, 
  sendLog, 
  createLogEmbed 
} = require("../systems/log");

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    if (!member?.guild || member.user.bot) return;

    try {
      const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);

      // Oblicz czas spędzony na serwerze (przybliżony)
      const timeOnServer = member.joinedTimestamp 
        ? Math.floor((Date.now() - member.joinedTimestamp) / 1000) 
        : null;

      const embed = createLogEmbed(
        "📤 Member Left",
        LOG_COLORS.LEAVE || "#ef4444",
        `**${member.user.tag}** opuścił serwer`,
        [
          { name: "👤 User", value: `<@${member.id}>`, inline: true },
          { name: "🆔 ID", value: `\`${member.id}\``, inline: true },
          { name: "📅 Konto utworzone", value: `<t:${createdTimestamp}:R>`, inline: true },
          { 
            name: "⏳ Był na serwerze", 
            value: timeOnServer 
              ? `<t:${Math.floor(Date.now()/1000) - timeOnServer}:R>` 
              : "Nieznane", 
            inline: true 
          },
          { name: "👥 Liczba członków", value: `\`${member.guild.memberCount}\``, inline: true }
        ],
        `Time: ${formatTime()}`
      );

      const success = await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);

      if (success) {
        console.log(`[LEAVE LOG] Zalogowano wyjście ${member.user.tag}`);
      } else {
        console.warn(`[LEAVE LOG] Nie udało się wysłać logu dla ${member.user.tag}`);
      }

    } catch (error) {
      console.error(`[LEAVE LOG] Error for ${member.user.tag}:`, error);
    }
  }
};
