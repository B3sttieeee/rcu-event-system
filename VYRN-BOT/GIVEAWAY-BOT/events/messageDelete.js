const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "messageDelete",

  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const ch = message.guild.channels.cache.get("1475992778554216448");
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
