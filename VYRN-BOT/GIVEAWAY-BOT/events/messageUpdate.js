const { EmbedBuilder } = require("discord.js");
const { getConfig } = require("../utils/configSystem");

module.exports = {
  name: "messageUpdate",

  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;

    const config = getConfig(oldMsg.guild.id);
    if (!config.logChannel) return;

    const ch = oldMsg.guild.channels.cache.get(config.logChannel);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setAuthor({
        name: oldMsg.author.tag,
        iconURL: oldMsg.author.displayAvatarURL()
      })
      .setTitle("✏️ Message Edited")
      .addFields(
        { name: "Before", value: oldMsg.content || "brak" },
        { name: "After", value: newMsg.content || "brak" }
      )
      .setFooter({ text: `User ID: ${oldMsg.author.id}` })
      .setTimestamp();

    ch.send({ embeds: [embed] });
  }
};
