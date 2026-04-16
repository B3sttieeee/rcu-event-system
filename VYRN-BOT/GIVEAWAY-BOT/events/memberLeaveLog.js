const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LOGS, formatTime, sendLog } = require("./logSystem");

const AUDIT_MAX_AGE = 15000;

const clampText = (value, max = 1024, fallback = "None") => {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  if (!text) return fallback;

  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const findKickEntry = async (member) => {
  try {
    const logs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 6
    });

    return (
      logs.entries.find((entry) => {
        const isFresh = Date.now() - entry.createdTimestamp <= AUDIT_MAX_AGE;
        return isFresh && entry.target?.id === member.id;
      }) || null
    );
  } catch {
    return null;
  }
};

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    try {
      const kickEntry = await findKickEntry(member);

      const title = kickEntry
        ? "👢 Member Kicked"
        : member.user.bot
          ? "🤖 Bot Removed"
          : "📤 Member Left";

      const executor = kickEntry?.executor
        ? `<@${kickEntry.executor.id}>`
        : kickEntry
          ? "Unknown"
          : "User left on their own";

      const reason = kickEntry?.reason
        ? clampText(kickEntry.reason, 1024, null)
        : null;

      const embed = new EmbedBuilder()
        .setColor("#ef4444")
        .setAuthor({
          name: member.user.tag,
          iconURL: member.user.displayAvatarURL({ size: 256 })
        })
        .setTitle(title)
        .addFields(
          { name: "👤 User", value: `<@${member.id}>`, inline: true },
          { name: "🆔 ID", value: member.id, inline: true },
          { name: "🛠 By", value: executor }
        )
        .setFooter({ text: `Time: ${formatTime()}` })
        .setTimestamp();

      if (reason) {
        embed.addFields({
          name: "📝 Reason",
          value: reason
        });
      }

      await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
    } catch (error) {
      console.error(`[LEAVE] Error for ${member.user.tag}:`, error);
    }
  }
};
