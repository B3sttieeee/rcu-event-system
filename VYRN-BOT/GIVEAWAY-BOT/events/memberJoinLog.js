const { Events, EmbedBuilder } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("./logSystem");

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL()
      })
      .setTitle(member.user.bot ? "🤖 Bot Joined" : "📥 Member Joined")
      .addFields(
        { name: "👤 User", value: `<@${member.id}>`, inline: true },
        { name: "🆔 ID", value: member.id, inline: true },
        { name: "🤖 Bot", value: member.user.bot ? "Yes" : "No", inline: true },
        {
          name: "📅 Account Created",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`
        },
        {
          name: "📊 Account Age",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
        },
        {
          name: "👥 Members",
          value: String(member.guild.memberCount),
          inline: true
        }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};
