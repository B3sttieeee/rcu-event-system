// src/systems/log/index.js
const { EmbedBuilder, ChannelType } = require("discord.js");

// ====================== CONFIG ======================
const LOGS = {
  JOIN_LEAVE: "1475992846912721018",   // Join / Leave
  SYSTEM:     "1475993709240778904",   // System events
  CHAT:       "1475992778554216448",   // Chat moderation
  MODERATION: "1475993709240778904",   // Moderacja
  VOICE:      "1475993709240778904",
  LEVEL:      "1475993709240778904",
};

const TIME_ZONE = "Europe/Warsaw";
const AUDIT_MAX_AGE = 15_000;

// Kolory
const LOG_COLORS = {
  JOIN_LEAVE: "#22c55e",
  LEAVE:      "#ef4444",
  SYSTEM:     "#3b82f6",
  CHAT:       "#eab308",
  MODERATION: "#f97316",
  VOICE:      "#8b5cf6",
  LEVEL:      "#f59e0b",
  ERROR:      "#ef4444",
  DEFAULT:    "#0a0a0a"
};

// ====================== POMOCNICZE FUNKCJE ======================
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
  }).format(new Date()).replace(",", " •");
};

const clampText = (value, max = 1024, fallback = "None") => {
  if (value == null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const formatAttachments = (attachments, max = 1024) => {
  if (!attachments?.size) return null;
  const lines = [...attachments.values()].map(a => a.url);
  return clampText(lines.join("\n"), max, null);
};

const formatRoleList = (roles, max = 1024) => {
  if (!roles?.size) return "None";
  const text = [...roles.values()].map(role => `<@&${role.id}>`).join(", ");
  return clampText(text, max, "None");
};

// ====================== CACHE KANAŁÓW ======================
const channelCache = new Map();

const resolveTextChannel = async (guild, channelId) => {
  if (channelCache.has(channelId)) return channelCache.get(channelId);

  let channel = guild.channels.cache.get(channelId);
  if (!channel) {
    channel = await guild.channels.fetch(channelId).catch(() => null);
  }

  if (!channel || !channel.isTextBased() || channel.type === ChannelType.GuildForum) {
    return null;
  }

  channelCache.set(channelId, channel);
  return channel;
};

// ====================== GŁÓWNA FUNKCJA WYSYŁANIA LOGA ======================
const sendLog = async (guild, channelId, embed) => {
  try {
    const channel = await resolveTextChannel(guild, channelId);
    if (!channel) {
      console.warn(`[LOG] Kanał ${channelId} nie istnieje lub nie jest tekstowy`);
      return false;
    }

    await channel.send({ embeds: [embed] });
    return true;
  } catch (err) {
    console.error(`[LOG] Błąd wysyłania do kanału ${channelId}:`, err.message);
    return false;
  }
};

// ====================== AUDIT LOG ======================
const findAuditEntry = async (guild, { type, limit = 6, maxAge = AUDIT_MAX_AGE, match = () => true }) => {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit });
    return logs.entries.find((entry) => {
      const isFresh = Date.now() - entry.createdTimestamp <= maxAge;
      return isFresh && match(entry);
    }) || null;
  } catch (err) {
    console.error(`[LOG] Audit log error for type ${type}:`, err.message);
    return null;
  }
};

const formatExecutor = (entry) => {
  if (!entry?.executor) return "Unknown";
  return `<@${entry.executor.id}> (${entry.executor.tag || entry.executor.id})`;
};

// ====================== TWORZENIE EMBEDA ======================
const createLogEmbed = (title, color, description = null, fields = [], footerText = null) => {
  const embed = new EmbedBuilder()
    .setColor(color || LOG_COLORS.DEFAULT)
    .setTitle(title)
    .setTimestamp();

  if (description) embed.setDescription(description);
  if (fields && fields.length > 0) embed.addFields(fields);
  if (footerText) embed.setFooter({ text: footerText });

  return embed;
};

// ====================== INIT ======================
function init() {
  console.log("📋 Log System → załadowany");
}

module.exports = {
  init,
  LOGS,
  LOG_COLORS,
  AUDIT_MAX_AGE,
  formatTime,
  clampText,
  formatAttachments,
  formatRoleList,
  resolveTextChannel,
  sendLog,
  findAuditEntry,
  formatExecutor,
  createLogEmbed
};
