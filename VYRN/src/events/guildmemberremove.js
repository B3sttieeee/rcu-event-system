const { Events } = require("discord.js");
const { LOGS, LOG_COLORS, formatTime, sendLog, createLogEmbed } = require("../systems/log");

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    if (!member?.guild || member.user?.bot) return;

    try {
      const now = Date.now();

      const createdTimestamp = member.user.createdTimestamp
        ? Math.floor(member.user.createdTimestamp / 1000)
        : null;

      const joinedTimestamp = member.joinedTimestamp
        ? Math.floor(member.joinedTimestamp / 1000)
        : null;

      const embed = createLogEmbed(
        "📤 Member Left",
        LOG_COLORS.LEAVE || "#ef4444",
        `**${member.user.tag}** left the server`,
        [
          { name: "👤 User", value: `<@${member.id}>`, inline: true },
          { name: "🆔 ID", value: `\`${member.id}\``, inline: true },
          {
            name: "📅 Account Created",
            value: createdTimestamp
              ? `<t:${createdTimestamp}:R>`
              : "Unknown",
            inline: true
          },
          {
            name: "⏳ Joined Server",
            value: joinedTimestamp
              ? `<t:${joinedTimestamp}:R>`
              : "Unknown",
            inline: true
          },
          {
            name: "👥 Server Members",
            value: `\`${member.guild.memberCount}\``,
            inline: true
          }
        ],
        `Time: ${formatTime()}`
      );

      const success = await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);

      if (!success) {
        console.warn(`[LEAVE LOG] Failed for ${member.user.tag}`);
      }

    } catch (err) {
      console.error("[LEAVE EVENT ERROR]", err);
    }
  }
};
