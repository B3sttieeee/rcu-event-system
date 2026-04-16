const { EmbedBuilder, Events } = require("discord.js");
const { DateTime } = require("luxon");

// ================= CONFIG =================
const LOGS = {
  JOIN_LEAVE: "1475992846912721018",
  SYSTEM: "1475993709240778904",
  CHAT: "1475992778554216448"
};

// ================= TIME =================
const formatTime = () =>
  DateTime.now()
    .setZone("Europe/Warsaw")
    .toFormat("dd.LL.yyyy • HH:mm:ss");

// ================= SEND =================
const sendLog = async (guild, channelId, embed) => {
  const ch = guild.channels.cache.get(channelId);
  if (!ch) return;
  await ch.send({ embeds: [embed] }).catch(() => {});
};

// =====================================================
// 📥 JOIN
// =====================================================
module.exports.guildMemberAdd = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setAuthor({
        name: `${member.user.tag}`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle("📥 Member Joined")
      .addFields(
        { name: "👤 User", value: `${member}`, inline: true },
        { name: "🆔 ID", value: member.id, inline: true },
        { name: "📅 Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>` }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};

// =====================================================
// 📤 LEAVE
// =====================================================
module.exports.guildMemberRemove = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: `${member.user.tag}`,
        iconURL: member.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle("📤 Member Left")
      .addFields(
        { name: "🆔 ID", value: member.id }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(member.guild, LOGS.JOIN_LEAVE, embed);
  }
};

// =====================================================
// 🗑 DELETE
// =====================================================
module.exports.messageDelete = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    if (message.partial) {
      try { await message.fetch(); } catch { return; }
    }

    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle("🗑 Message Deleted")
      .addFields(
        { name: "👤 User", value: `<@${message.author.id}>`, inline: true },
        { name: "🆔 ID", value: message.author.id, inline: true },
        { name: "📍 Channel", value: `<#${message.channel.id}>` },
        {
          name: "💬 Content",
          value: message.content
            ? message.content.slice(0, 1000)
            : "No text / embed / attachment"
        }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(message.guild, LOGS.CHAT, embed);
  }
};

// =====================================================
// ✏️ EDIT
// =====================================================
module.exports.messageUpdate = {
  name: Events.MessageUpdate,
  async execute(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;

    const embed = new EmbedBuilder()
      .setColor("#f59e0b")
      .setAuthor({
        name: oldMsg.author.tag,
        iconURL: oldMsg.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle("✏️ Message Edited")
      .addFields(
        { name: "👤 User", value: `<@${oldMsg.author.id}>`, inline: true },
        { name: "📍 Channel", value: `<#${oldMsg.channel.id}>` },
        {
          name: "Before",
          value: oldMsg.content?.slice(0, 500) || "None"
        },
        {
          name: "After",
          value: newMsg.content?.slice(0, 500) || "None"
        }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(oldMsg.guild, LOGS.CHAT, embed);
  }
};

// =====================================================
// 🏷 ROLE UPDATE
// =====================================================
module.exports.guildMemberUpdate = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (!added.size && !removed.size) return;

    const embed = new EmbedBuilder()
      .setColor("#3b82f6")
      .setAuthor({
        name: newMember.user.tag,
        iconURL: newMember.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle("🏷 Role Update")
      .addFields(
        {
          name: "➕ Added",
          value: added.map(r => `<@&${r.id}>`).join(", ") || "None"
        },
        {
          name: "➖ Removed",
          value: removed.map(r => `<@&${r.id}>`).join(", ") || "None"
        }
      )
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(newMember.guild, LOGS.SYSTEM, embed);
  }
};

// =====================================================
// 🔨 BAN / UNBAN
// =====================================================
module.exports.guildBanAdd = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setAuthor({
        name: ban.user.tag,
        iconURL: ban.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle("🔨 User Banned")
      .addFields({ name: "🆔 ID", value: ban.user.id })
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(ban.guild, LOGS.SYSTEM, embed);
  }
};

module.exports.guildBanRemove = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setAuthor({
        name: ban.user.tag,
        iconURL: ban.user.displayAvatarURL({ dynamic: true })
      })
      .setTitle("♻️ User Unbanned")
      .addFields({ name: "🆔 ID", value: ban.user.id })
      .setFooter({ text: `Time: ${formatTime()}` })
      .setTimestamp();

    sendLog(ban.guild, LOGS.SYSTEM, embed);
  }
};
