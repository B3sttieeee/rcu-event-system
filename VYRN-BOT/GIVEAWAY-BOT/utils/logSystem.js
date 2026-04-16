const { ChannelType } = require("discord.js");

const LOGS = {
  JOIN_LEAVE: "1475992846912721018",
  SYSTEM: "1475993709240778904",
  CHAT: "1475992778554216448"
};

const TIME_ZONE = "Europe/Warsaw";
const AUDIT_MAX_AGE = 15_000;

const formatTime = () => {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  })
    .format(new Date())
    .replace(",", " •");
};

const clampText = (value, max = 1024, fallback = "None") => {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  if (!text) return fallback;

  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const formatAttachments = (attachments, max = 1024) => {
  if (!attachments?.size) return null;

  const lines = [...attachments.values()].map((attachment) => attachment.url);
  return clampText(lines.join("\n"), max, null);
};

const formatRoleList = (roles, max = 1024) => {
  if (!roles?.size) return "None";

  const text = [...roles.values()]
    .map((role) => `<@&${role.id}>`)
    .join(", ");

  return clampText(text, max, "None");
};

const resolveTextChannel = async (guild, channelId) => {
  let channel = guild.channels.cache.get(channelId);

  if (!channel) {
    channel = await guild.channels.fetch(channelId).catch(() => null);
  }

  if (!channel) return null;
  if (!channel.isTextBased()) return null;
  if (channel.type === ChannelType.GuildForum) return null;

  return channel;
};

const sendLog = async (guild, channelId, embed) => {
  try {
    const channel = await resolveTextChannel(guild, channelId);
    if (!channel) return false;

    await channel.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
};

const findAuditEntry = async (
  guild,
  {
    type,
    limit = 6,
    maxAge = AUDIT_MAX_AGE,
    match = () => true
  }
) => {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit });

    return (
      logs.entries.find((entry) => {
        const isFresh = Date.now() - entry.createdTimestamp <= maxAge;
        return isFresh && match(entry);
      }) || null
    );
  } catch {
    return null;
  }
};

const formatExecutor = (entry) => {
  if (!entry?.executor) return "Unknown";
  return `<@${entry.executor.id}>`;
};

module.exports = {
  LOGS,
  AUDIT_MAX_AGE,
  formatTime,
  clampText,
  formatAttachments,
  formatRoleList,
  resolveTextChannel,
  sendLog,
  findAuditEntry,
  formatExecutor
};
