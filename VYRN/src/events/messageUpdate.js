// src/events/messageUpdate.js
const { Events } = require("discord.js");
const { 
  LOGS, 
  LOG_COLORS, 
  formatTime, 
  sendLog, 
  clampText, 
  createLogEmbed 
} = require("../systems/log");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild) return;
    if (oldMsg.author?.bot || newMsg.author?.bot) return;

    if (oldMsg.partial) try { await oldMsg.fetch(); } catch { return; }
    if (newMsg.partial) try { await newMsg.fetch(); } catch { return; }

    const before = clampText(oldMsg.content || "", 800, "[No content]");
    const after = clampText(newMsg.content || "", 800, "[No content]");

    if (before === after) return;

    const embed = createLogEmbed(
      "✏️ Message Edited",
      LOG_COLORS.CHAT,
      `**Wiadomość została edytowana**`,
      [
        { name: "👤 User", value: `<@${oldMsg.author.id}> (${oldMsg.author.tag})`, inline: true },
        { name: "🆔 Message ID", value: `\`${oldMsg.id}\``, inline: true },
        { name: "📍 Channel", value: `<#${oldMsg.channel.id}>`, inline: true },
        { name: "📜 Before", value: before, inline: false },
        { name: "📝 After", value: after, inline: false },
      ],
      `Time: ${formatTime()}`
    );

    if (newMsg.url) {
      embed.addFields({ name: "🔗 Jump to Message", value: `[Click here](${newMsg.url})` });
    }

    await sendLog(oldMsg.guild, LOGS.CHAT, embed);
  }
};
