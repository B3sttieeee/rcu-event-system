const { Events, EmbedBuilder } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

module.exports = {
  name: Events.MessageUpdate,

  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;

    const embed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setAuthor({
        name: oldMsg.author.tag,
        iconURL: oldMsg.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle("✏️ Message Edited")

      .addFields(
        { name: "👤 User", value: `<@${oldMsg.author.id}>`, inline: true },
        { name: "📍 Channel", value: `<#${oldMsg.channel.id}>` },
        { name: "Before", value: oldMsg.content?.slice(0, 500) || "None" },
        { name: "After", value: newMsg.content?.slice(0, 500) || "None" }
      )

      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(oldMsg.guild, LOGS.CHAT, embed);
  }
};
