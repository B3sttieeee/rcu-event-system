// src/systems/log/index.js
const { EmbedBuilder, ChannelType, Events } = require("discord.js");

// ====================== CONFIG ======================
const LOGS = {
  JOIN_LEAVE: "1475992846912721018",   // Join / Leave
  SYSTEM:     "1475993709240778904",   // System events
  CHAT:       "1475992778554216448",   // Chat moderation (Deleted/Edited msgs)
  MODERATION: "1475993709240778904",   // Moderation (Bans, Kicks, etc.)
  VOICE:      "1475993709240778904",   // Voice channels (Join/Leave/Move)
  LEVEL:      "1475993709240778904",   // Level ups
};

const TIME_ZONE = "Europe/Warsaw";
const AUDIT_MAX_AGE = 15_000;

// PRESTIGE VYRN THEME
const THEME = {
  GOLD:     "#FFD700",
  BLACK:    "#0a0a0a",
  WHITE:    "#FFFFFF",
  SUCCESS:  "#00FF7F", // Do wejść na serwer
  DANGER:   "#ff4757", // Do usuniętych wiadomości/wyjść
  BLUE:     "#3b82f6"  // Do edycji i przenosin
};

// ====================== HELPERS ======================
const formatTime = () => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).format(new Date());
};

const clampText = (value, max = 1024, fallback = "None") => {
  if (value == null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

// ====================== CACHE & SENDER ======================
const channelCache = new Map();

const resolveTextChannel = async (guild, channelId) => {
  if (channelCache.has(channelId)) return channelCache.get(channelId);

  let channel = guild.channels.cache.get(channelId);
  if (!channel) channel = await guild.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased() || channel.type === ChannelType.GuildForum) return null;

  channelCache.set(channelId, channel);
  return channel;
};

const sendLog = async (guild, channelId, embed) => {
  try {
    const channel = await resolveTextChannel(guild, channelId);
    if (!channel) return false;
    await channel.send({ embeds: [embed] });
    return true;
  } catch (err) {
    console.error(`[LOG] Error sending to ${channelId}:`, err.message);
    return false;
  }
};

// ====================== EVENT LISTENERS (NEW!) ======================
// Ten blok automatycznie loguje wydarzenia na serwerze!

function registerEvents(client) {
  
  // 1. MESSAGE DELETED
  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setColor(THEME.DANGER)
      .setAuthor({ name: "🗑️ Message Deleted", iconURL: message.author?.displayAvatarURL() })
      .setDescription(`**Author:** ${message.author} (${message.author.id})\n**Channel:** ${message.channel}`)
      .addFields({ name: "Content", value: clampText(message.content, 1000, "*No text content (Image/Embed)*") })
      .setFooter({ text: "VYRN Log System" })
      .setTimestamp();

    await sendLog(message.guild, LOGS.CHAT, embed);
  });

  // 2. MESSAGE EDITED
  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return; // Ignore embed updates

    const embed = new EmbedBuilder()
      .setColor(THEME.BLUE)
      .setAuthor({ name: "✏️ Message Edited", iconURL: newMsg.author?.displayAvatarURL() })
      .setDescription(`**Author:** ${newMsg.author} (${newMsg.author.id})\n**Channel:** ${newMsg.channel}\n**Link:** [Jump to message](${newMsg.url})`)
      .addFields(
        { name: "Old Content", value: clampText(oldMsg.content, 1000) },
        { name: "New Content", value: clampText(newMsg.content, 1000) }
      )
      .setFooter({ text: "VYRN Log System" })
      .setTimestamp();

    await sendLog(newMsg.guild, LOGS.CHAT, embed);
  });

  // 3. MEMBER JOIN
  client.on(Events.GuildMemberAdd, async (member) => {
    const unixTime = Math.floor(member.user.createdTimestamp / 1000);
    const embed = new EmbedBuilder()
      .setColor(THEME.SUCCESS)
      .setAuthor({ name: "📥 Member Joined", iconURL: member.user.displayAvatarURL() })
      .setDescription(`**User:** ${member.user} (${member.user.tag})\n**ID:** \`${member.id}\`\n\n**Account Created:** <t:${unixTime}:R>`)
      .setFooter({ text: `Total Members: ${member.guild.memberCount}` })
      .setTimestamp();

    await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  });

  // 4. MEMBER LEAVE
  client.on(Events.GuildMemberRemove, async (member) => {
    const embed = new EmbedBuilder()
      .setColor(THEME.DANGER)
      .setAuthor({ name: "🚪 Member Left", iconURL: member.user.displayAvatarURL() })
      .setDescription(`**User:** ${member.user} (${member.user.tag})\n**ID:** \`${member.id}\``)
      .setFooter({ text: `Total Members: ${member.guild.memberCount}` })
      .setTimestamp();

    await sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  });

  // 5. VOICE STATE (Join/Leave/Move)
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (oldState.member.user.bot) return; // Ignoruj boty skaczące po kanałach

    const member = newState.member || oldState.member;
    const embed = new EmbedBuilder()
      .setAuthor({ name: "🎤 Voice Activity", iconURL: member.user.displayAvatarURL() })
      .setFooter({ text: "VYRN Log System" })
      .setTimestamp();

    // Joined
    if (!oldState.channelId && newState.channelId) {
      embed.setColor(THEME.SUCCESS).setDescription(`**User:** ${member}\n**Action:** Joined voice channel\n**Channel:** ${newState.channel}`);
      return await sendLog(newState.guild, LOGS.VOICE, embed);
    }
    
    // Left
    if (oldState.channelId && !newState.channelId) {
      embed.setColor(THEME.DANGER).setDescription(`**User:** ${member}\n**Action:** Left voice channel\n**Channel:** ${oldState.channel}`);
      return await sendLog(oldState.guild, LOGS.VOICE, embed);
    }

    // Moved
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      embed.setColor(THEME.GOLD).setDescription(`**User:** ${member}\n**Action:** Moved channels\n**From:** ${oldState.channel}\n**To:** ${newState.channel}`);
      return await sendLog(newState.guild, LOGS.VOICE, embed);
    }
  });
}

// ====================== INIT ======================
function init(client) {
  console.log("📋 VYRN Log System → Loaded and Listening");
  
  // Uruchomienie automatycznego nasłuchiwania wydarzeń
  registerEvents(client);
}

module.exports = {
  init,
  LOGS,
  THEME,
  AUDIT_MAX_AGE,
  formatTime,
  clampText,
  resolveTextChannel,
  sendLog
};
