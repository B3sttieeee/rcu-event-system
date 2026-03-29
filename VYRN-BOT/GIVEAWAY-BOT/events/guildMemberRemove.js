const { EmbedBuilder } = require("discord.js");
const { getConfig } = require("../utils/configSystem");

module.exports = {
  name: "guildMemberRemove",

  async execute(member) {
    const config = getConfig(member.guild.id);
    if (!config.logChannel) return;

    const ch = member.guild.channels.cache.get(config.logChannel);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setDescription(`${member.user.tag} left`)
      .setTimestamp();

    ch.send({ embeds: [embed] });
  }
};
