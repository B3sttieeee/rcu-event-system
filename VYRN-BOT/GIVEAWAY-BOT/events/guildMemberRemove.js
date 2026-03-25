const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberRemove",

  async execute(member) {
    const ch = member.guild.channels.cache.get("1475992846912721018");

    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: "Member Left",
        iconURL: member.user.displayAvatarURL()
      })
      .setDescription(
        `${member.user.tag}\n\n🆔 ID: ${member.id}`
      )
      .setTimestamp();

    ch.send({ embeds: [embed] });
  }
};
