const { EmbedBuilder } = require("discord.js");
const { getConfig } = require("../utils/configSystem");

module.exports = {
  name: "messageDelete",

  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const config = getConfig(message.guild.id);
    if (!config.logChannel) return;

    const ch = message.guild.channels.cache.get(config.logChannel);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      })
      .setTitle("🗑 Message Deleted")
      .setDescription(message.content || "embed/file")
      .setFooter({ text: `User ID: ${message.author.id}` })
      .setTimestamp();

    ch.send({ embeds: [embed] });
  }
};
