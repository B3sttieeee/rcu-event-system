const { EmbedBuilder } = require("discord.js");
const { getConfig } = require("../utils/configSystem");

module.exports = {
  name: "messageDelete",

  async execute(message) {
    try {
      if (!message.guild || message.author?.bot) return;

      // 🔥 jeśli partial → spróbuj pobrać
      if (message.partial) {
        try {
          await message.fetch();
        } catch {
          return;
        }
      }

      const config = getConfig(message.guild.id);
      if (!config?.logChannel) return;

      const ch = message.guild.channels.cache.get(config.logChannel);
      if (!ch) return;

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setAuthor({
          name: message.author?.tag || "Unknown",
          iconURL: message.author?.displayAvatarURL()
        })
        .setTitle("🗑 Message Deleted")
        .setDescription(message.content || "embed/file")
        .setFooter({ text: `User ID: ${message.author?.id || "unknown"}` })
        .setTimestamp();

      await ch.send({ embeds: [embed] }).catch(() => {});

    } catch (err) {
      console.log("❌ MESSAGE DELETE ERROR:", err);
    }
  }
};
