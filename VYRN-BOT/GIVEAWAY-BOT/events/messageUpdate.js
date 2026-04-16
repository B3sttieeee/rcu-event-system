const { Events, EmbedBuilder } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("../logSystem");

const trimText = (text, limit = 500) => {
  if (!text) return "None";
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
};

module.exports = {
  name: Events.MessageUpdate,

  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild) return;

    if (oldMsg.partial) {
      try {
        await oldMsg.fetch();
      } catch {
        return;
      }
    }

    if (newMsg.partial) {
      try {
        await newMsg.fetch();
      } catch {
        return;
      }
    }

    if (!oldMsg.author || oldMsg.author.bot) return;
    if (oldMsg.content === newMsg.content) return;

    const embed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setAuthor({
        name: oldMsg.author.tag,
        iconURL: oldMsg.author.displayAvatarURL()
      })
      .setTitle("✏️ Message Edited")
      .addFields(
        { name: "👤 User", value: `<@${oldMsg.author.id}>`, inline: true },
        { name: "🆔 ID", value: oldMsg.author.id, inline: true },
        { name: "📍 Channel", value: `<#${oldMsg.channel.id}>` },
        { name: "Before", value: trimText(oldMsg.content) },
        { name: "After", value: trimText(newMsg.content) }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    await sendLog(oldMsg.guild, LOGS.CHAT, embed);
  }
};
