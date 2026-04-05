const { EmbedBuilder } = require("discord.js");
const { getConfig } = require("../utils/configSystem");

module.exports = {
  name: "guildMemberRemove",

  async execute(member) {
    try {
      const config = getConfig(member.guild.id);
      if (!config?.logChannel) return;

      const channel = member.guild.channels.cache.get(config.logChannel);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(`👋 ${member.user.tag} left the server`)
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(err => {
        console.log("❌ LOG SEND ERROR:", err.message);
      });

    } catch (err) {
      console.log("❌ LEAVE EVENT ERROR:", err);
    }
  }
};
