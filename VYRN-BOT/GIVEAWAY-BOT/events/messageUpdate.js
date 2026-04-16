const { Events, EmbedBuilder } = require("discord.js");
const {
  LOGS,
  formatTime,
  sendLog,
  clampText
} = require("./logSystem");

module.exports = {
  name: Events.MessageUpdate,

  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild) return;

    if (oldMsg.partial) {
      try {
        await oldMsg.fetch();
      } catch {}
    }

    if (newMsg.partial) {
      try {
        await newMsg.fetch();
      } catch {}
    }

    if (oldMsg.author?.bot) return;

    const before = clampText(oldMsg.content, 500, "None");
    const after = clampText(newMsg.content, 500, "None");

    if (before === after) return;

    const embed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setAuthor({
        name: oldMsg.author?.tag || "Unknown User",
        iconURL: oldMsg.author?.displayAvatarURL() || null
      })
      .setTitle("✏️ Message Edited")
      .addFields(
        {
          name: "👤 User",
          value: oldMsg.author?.id ? `<@${oldMsg.author.id}>` : "Unknown",
          inline: true
        },
        {
          name: "🆔 ID",
          value: oldMsg.author?.id || "Unknown",
          inline: true
        },
        {
          name: "📍 Channel",
          value: oldMsg.channel?.id ? `<#${oldMsg.channel.id}>` : "Unknown"
        },
        { name: "Before", value: before },
        { name: "After", value: after }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    if (newMsg.url) {
      embed.addFields({ name: "🔗 Jump", value: newMsg.url });
    }

    await sendLog(oldMsg.guild, LOGS.CHAT, embed);
  }
};
