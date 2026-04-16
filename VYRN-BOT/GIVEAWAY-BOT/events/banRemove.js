const { Events, EmbedBuilder } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.GuildBanRemove,

  async execute(ban) {
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("♻️ User Unbanned")

      .addFields(
        { name: "👤 User", value: `<@${ban.user.id}>` }
      )

      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(ban.guild, LOGS.SYSTEM, embed);
  }
};
