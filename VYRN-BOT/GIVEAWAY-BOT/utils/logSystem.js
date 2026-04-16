const { ChannelType } = require("discord.js");
const { DateTime } = require("luxon");

// =====================================================
// LOG CHANNELS
// =====================================================
const LOGS = {
  JOIN_LEAVE: "1475992846912721018",
  SYSTEM: "1475993709240778904",
  CHAT: "1475992778554216448"
};

// =====================================================
// TIME FORMAT
// =====================================================
const formatTime = () =>
  DateTime.now()
    .setZone("Europe/Warsaw")
    .toFormat("dd.LL.yyyy • HH:mm:ss");

// =====================================================
// SEND LOG EMBED
// =====================================================
const sendLog = async (guild, channelId, embed) => {
  try {
    let channel = guild.channels.cache.get(channelId);

    if (!channel) {
      channel = await guild.channels.fetch(channelId).catch(() => null);
    }

    if (!channel) return false;
    if (!channel.isTextBased()) return false;
    if (channel.type === ChannelType.GuildForum) return false;

    await channel.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  LOGS,
  formatTime,
  sendLog
};
