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
    if (!member || !member.guild) return;
    if (member.user.bot) return;   // opcjonalnie możesz logować też boty

    try {
      const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
      const joinedTimestamp = member.joinedTimestamp 
        ? Math.floor(member.joinedTimestamp / 1000) 
        : null;

      const embed = createLogEmbed(
        "📤 Member Left",
        LOG_COLORS.LEAVE,                    // czerwony kolor
        `**${member.user.tag}** opuścił serwer`,
        [
          { name: "👤 User", value: `<@${member.id}>`, inline: true },
          { name: "🆔 ID", value: `\`${member.id}\``, inline: true },
          { name: "📅 Konto utworzone", value: `<t:${createdTimestamp}:R>`, inline: true },
          { name: "⏳ Był na serwerze", 
            value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : "Nieznane", 
            inline: true 
          },
          { name: "👥 Liczba członków", value: `\`${member.guild.memberCount}\``, inline: true }
        ],
        `Time: ${formatTime()}`
      );

      await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);

      console.log(`[LEAVE LOG] ${member.user.tag} left the server`);

    } catch (error) {
      console.error(`[LEAVE LOG] Error for ${member.user.tag}:`, error);
    }
  }
};
