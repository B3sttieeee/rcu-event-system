const { EmbedBuilder } = require("discord.js");
const { addXP, getMultiplier } = require("../utils/levelSystem");

// ===== CONFIG =====
const PREFIX = ".";
const LEVEL_CHANNEL = "1475999590716018719";

module.exports = {
  name: "messageCreate",

  async execute(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const gained = Math.floor(5 * getMultiplier(message.member));

    const result = await addXP(message.member, gained);

    // LEVEL UP
    if (result.leveledUp) {
      const channel = message.guild.channels.cache.get(LEVEL_CHANNEL);

      if (channel) {
        const embed = new EmbedBuilder()
          .setColor("#facc15")
          .setAuthor({
            name: `${message.author.username} • Level Up`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(`🎯 Level: **${result.level}**`)
          .setThumbnail(message.author.displayAvatarURL());

        channel.send({
          content: `🎉 ${message.author}`,
          embeds: [embed]
        });
      }
    }

    // ===== COMMANDS =====
    if (!message.content.startsWith(PREFIX)) return;

    const cmd = message.content.slice(PREFIX.length).trim().toLowerCase();

    // możesz tu dodać rank/top później
  }
};
