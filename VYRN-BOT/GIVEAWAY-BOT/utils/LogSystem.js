const { ChannelType } = require("discord.js");
const { DateTime } = require("luxon");

// =====================================================
// CONFIG
// =====================================================
const LOGS = {
  JOIN_LEAVE: "1475992846912721018",
  SYSTEM: "1475993709240778904",
  CHAT: "1475992778554216448"
};

// =====================================================
// TIME
// =====================================================
const formatTime = () =>
  DateTime.now()
    .setZone("Europe/Warsaw")
    .toFormat("dd.LL.yyyy • HH:mm:ss");

// =====================================================
// TEXT HELPERS
// =====================================================
const trimText = (text, limit = 1000) => {
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
};

const formatAttachments = (message, limit = 1000) => {
  if (!message?.attachments?.size) return null;

  const text = [...message.attachments.values()]
    .map((attachment) => attachment.url)
    .join("\n");

  return trimText(text, limit);
};

const formatRoleList = (roles, limit = 1024) => {
  if (!roles?.size) return "None";

  const text = roles.map((role) => `<@&${role.id}>`).join(", ");
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
};

// =====================================================
// AUDIT LOG HELPERS
// =====================================================
const findAuditEntry = async (guild, type, predicate, limit = 5, maxAge = 15000) => {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit });

    const entry = logs.entries.find((log) => {
      const isFresh = Date.now() - log.createdTimestamp < maxAge;
      return isFresh && predicate(log);
    });

    return entry || null;
  } catch {
    return null;
  }
};

const formatExecutor = (entry) => {
  if (!entry?.executor) return "Unknown";
  return `<@${entry.executor.id}>`;
};

// =====================================================
// CHANNEL / SEND
// =====================================================
const resolveLogChannel = async (guild, channelId) => {
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
    const channel = await resolveLogChannel(guild, channelId);
    if (!channel) return false;

    await channel.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
};

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  LOGS,

  formatTime,
  trimText,
  formatAttachments,
  formatRoleList,

  findAuditEntry,
  formatExecutor,

  resolveLogChannel,
  sendLog
};
