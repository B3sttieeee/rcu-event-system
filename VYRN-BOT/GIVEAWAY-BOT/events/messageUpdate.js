const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "messageUpdate",

  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;

    const ch = oldMsg.guild.channels.cache.get("1475992778554216448");
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setAuthor({
        name: oldMsg.author.tag,
        iconURL: oldMsg.author.displayAvatarURL()
      })
      .setTitle("✏️ Message Edited")
      .addFields(
        { name: "Before", value: oldMsg.content || "brak", inline: false },
        { name: "After", value: newMsg.content || "brak", inline: false }
      )
      .setFooter({ text: `User ID: ${oldMsg.author.id}` })
      .setTimestamp();

    ch.send({ embeds: [embed] });
  }
};
