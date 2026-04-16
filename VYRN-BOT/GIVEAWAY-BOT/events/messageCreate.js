const { Events, EmbedBuilder } = require("discord.js");
const { handleMessageXP, neededXP } = require("../utils/levelSystem");

const LEVEL_CHANNEL_ID = "1475999590716018719";
const BLOCKED_PREFIXES = ["?", "!", ".", "$"];

// =====================================================
// HELPERS
// =====================================================
const clampText = (value, max = 220, fallback = "Brak treści") => {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  if (!text) return fallback;

  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const createProgressBar = (current, required, size = 10) => {
  if (!required || required <= 0) {
    return "▱".repeat(size);
  }

  const percent = Math.max(0, Math.min(100, Math.floor((current / required) * 100)));
  const filled = Math.round((percent / 100) * size);

  return "▰".repeat(filled) + "▱".repeat(size - filled);
};

const resolveLevelChannel = async (guild) => {
  let channel = guild.channels.cache.get(LEVEL_CHANNEL_ID);

  if (!channel) {
    channel = await guild.channels.fetch(LEVEL_CHANNEL_ID).catch(() => null);
  }

  if (!channel || !channel.isTextBased()) return null;
  return channel;
};

const buildLevelUpEmbed = (member, message, result) => {
  const requiredXP = neededXP(result.level);
  const progressPercent = requiredXP > 0
    ? Math.floor((result.xp / requiredXP) * 100)
    : 0;

  const progressBar = createProgressBar(result.xp, requiredXP);

  const embed = new EmbedBuilder()
    .setColor("#f59e0b")
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.displayAvatarURL()
    })
    .setTitle("🏆 Level Up")
    .setDescription(
      [
        `**${member} wbił poziom \`${result.level}\`**`,
        "",
        "━━━━━━━━━━━━━━━━━━",
        "",
        `✨ **Zdobyte XP:** \`${result.gained}\``,
        `📊 **Aktualne XP:** \`${result.xp} / ${requiredXP}\``,
        `📈 **Postęp:** ${progressBar} \`${progressPercent}%\``,
        `💬 **Kanał:** <#${message.channel.id}>`
      ].join("\n")
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({
      text: "VYRN • Level System"
    })
    .setTimestamp();

  if (message.content?.trim()) {
    embed.addFields({
      name: "📝 Ostatnia wiadomość",
      value: clampText(message.content, 256, "Brak treści")
    });
  }

  return embed;
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

    const content = (message.content || "").trim();

    if (!content && !message.attachments?.size) return;

    if (content && BLOCKED_PREFIXES.some((prefix) => content.startsWith(prefix))) {
      return;
    }

    const member =
      message.member ||
      (await message.guild.members.fetch(message.author.id).catch(() => null));

    if (!member) return;

    const result = await handleMessageXP(member, content);
    if (!result?.leveledUp) return;

    const levelChannel = await resolveLevelChannel(message.guild);
    if (!levelChannel) return;

    const embed = buildLevelUpEmbed(member, message, result);

    await levelChannel.send({
      embeds: [embed]
    }).catch(() => {});
  }
};
