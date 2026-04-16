const { Events, EmbedBuilder } = require("discord.js");
const { handleMessageXP } = require("../utils/levelSystem");

const LEVEL_CHANNEL_ID = "1475999590716018719";

// =====================================================
// HELPERS
// =====================================================
const resolveLevelChannel = async (guild) => {
  let channel = guild.channels.cache.get(LEVEL_CHANNEL_ID);

  if (!channel) {
    channel = await guild.channels.fetch(LEVEL_CHANNEL_ID).catch(() => null);
  }

  if (!channel || !channel.isTextBased()) return null;
  return channel;
};

const buildLevelUpEmbed = (member, level) => {
  return new EmbedBuilder()
    .setColor("#f59e0b")
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.displayAvatarURL()
    })
    .setTitle("🏆 Level Up")
    .setDescription(
      [
        `**${member} wbił nowy poziom!**`,
        "",
        `📈 **Aktualny poziom:** \`${level}\``,
        "",
        "Gratulacje i lecimy dalej."
      ].join("\n")
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({
      text: "VYRN • Level System"
    })
    .setTimestamp();
};

// =====================================================
// EVENT
// =====================================================
module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.guild) return;
    if (!message.author || message.author.bot) return;
    if (message.system || message.webhookId) return;

    const member =
      message.member ||
      (await message.guild.members.fetch(message.author.id).catch(() => null));

    if (!member) return;

    const result = await handleMessageXP(member, message.content || "");
    if (!result?.leveledUp) return;

    const levelChannel = await resolveLevelChannel(message.guild);
    if (!levelChannel) return;

    const embed = buildLevelUpEmbed(member, result.level);

    await levelChannel.send({
      embeds: [embed]
    }).catch(() => {});
  }
};
