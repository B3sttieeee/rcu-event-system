const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  Events
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // ownerId => channelId
const bannedUsers = new Map();  // channelId => Set(userId)

console.log("[VOICE PANEL] System initialized");
userChannels.clear();

// ================= VOICE CREATE =================
module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const joined = !oldState.channel &&
      newState.channel?.id === CREATE_CHANNEL_ID;

    if (joined) {
      await createPrivateChannel(member);
      return;
    }

    // block banned users
    if (newState.channel) {
      const banned = bannedUsers.get(newState.channel.id);
      if (banned?.has(member.id)) {
        await member.voice.setChannel(null).catch(() => {});
      }
    }
  }
};

// ================= CREATE VOICE =================
async function createPrivateChannel(member) {
  const guild = member.guild;

  if (userChannels.has(member.id)) {
    const old = guild.channels.cache.get(userChannels.get(member.id));
    if (old) return member.voice.setChannel(old).catch(() => {});
  }

  await wait(3500);

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID)
    return;

  const channel = await guild.channels.create({
    name: `・${member.displayName}`,
    type: ChannelType.GuildVoice,
    parent: PRIVATE_CATEGORY_ID,
    userLimit: 5,

    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.Connect]
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ]
  });

  userChannels.set(member.id, channel.id);

  await member.voice.setChannel(channel).catch(() => {});

  await sendVoicePanel(channel, member);
  startWatcher(channel, member.id);
}

// ================= PREMIUM BLACK PANEL =================
async function sendVoicePanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      [
        "```diff",
        "+ PRIVATE CHANNEL SYSTEM ACTIVE",
        "- Unauthorized access is restricted",
        "```",
        "",
        `👑 Owner: ${owner}`,
        `🎧 Channel: ${channel.name}`,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "**Select an action below to manage your voice channel**"
      ].join("\n")
    )
    .addFields(
      {
        name: "⚙️ CHANNEL SETTINGS",
        value:
          "✏️ Rename Channel\n" +
          "👥 Set User Limit\n" +
          "🔒 Lock Channel\n" +
          "🔓 Unlock Channel\n" +
          "🗑 Delete Channel",
        inline: false
      },
      {
        name: "🛡 SECURITY CONTROL",
        value:
          "🚪 Kick User\n" +
          "🔨 Ban User\n" +
          "🔓 Unban User",
        inline: false
      }
    )
    .setFooter({
      text: "Private Voice System • VYRN Security Layer"
    })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Select control option...")
    .addOptions([
      { label: "Rename Channel", value: "rename", emoji: "✏️" },
      { label: "Set User Limit", value: "limit", emoji: "👥" },
      { label: "Kick User", value: "kick", emoji: "🚪" },
      { label: "Ban User", value: "ban", emoji: "🔨" },
      { label: "Unban User", value: "unban", emoji: "🔓" },
      { label: "Lock Channel", value: "lock", emoji: "🔒" },
      { label: "Unlock Channel", value: "unlock", emoji: "🔓" },
      { label: "Delete Channel", value: "delete", emoji: "🗑" }
    ]);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

// ================= PANEL HANDLER =================
async function handlePrivatePanel(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const owner = getOwner(channelId);
  if (interaction.user.id !== owner) {
    return interaction.reply({
      content: "❌ You are not the owner of this channel.",
      ephemeral: true
    });
  }

  const action = interaction.values[0];

  // ===== MODALS =====
  if (action === "rename" || action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`private_${action}_${channel.id}`)
      .setTitle(
        action === "rename"
          ? "Rename Your Channel"
          : "Set User Limit"
      );

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel(action === "rename" ? "New name" : "Limit (1-99)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  // ===== ACTIONS =====
  await interaction.deferUpdate();

  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });
    return reply(interaction, "🔒 Channel locked");
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });
    return reply(interaction, "🔓 Channel unlocked");
  }

  if (action === "kick") {
    const target = pickUser(channel, owner);
    if (!target) return reply(interaction, "No user found");

    await target.voice.setChannel(null).catch(() => {});
    return reply(interaction, `🚪 Kicked ${target.user.tag}`);
  }

  if (action === "ban") {
    const target = pickUser(channel, owner);
    if (!target) return reply(interaction, "No user found");

    if (!bannedUsers.has(channel.id))
      bannedUsers.set(channel.id, new Set());

    bannedUsers.get(channel.id).add(target.id);
    await target.voice.setChannel(null).catch(() => {});

    return reply(interaction, `🔨 Banned ${target.user.tag}`);
  }

  if (action === "unban") {
    const set = bannedUsers.get(channel.id);
    if (!set || !set.size)
      return reply(interaction, "No banned users");

    const id = [...set][0];
    set.delete(id);

    return reply(interaction, `🔓 Unbanned <@${id}>`);
  }

  if (action === "delete") {
    userChannels.delete(owner);
    await channel.delete().catch(() => {});
    return reply(interaction, "🗑 Channel deleted");
  }
}

// ================= MODALS =================
async function handleModal(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const value = interaction.fields.getTextInputValue("value");

  if (action === "rename") {
    await channel.setName(value);
    return reply(interaction, "✏️ Renamed");
  }

  if (action === "limit") {
    await channel.setUserLimit(parseInt(value));
    return reply(interaction, "👥 Limit updated");
  }
}

// ================= HELPERS =================
function pickUser(channel, ownerId) {
  return [...channel.members.values()].find(m => m.id !== ownerId);
}

function getOwner(channelId) {
  for (const [owner, id] of userChannels) {
    if (id === channelId) return owner;
  }
  return null;
}

function reply(i, msg) {
  return i.followUp({ content: msg, ephemeral: true });
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function startWatcher(channel, ownerId) {
  setInterval(async () => {
    const fresh = await channel.guild.channels.fetch(channel.id).catch(() => null);

    if (!fresh || fresh.members.size === 0) {
      await fresh?.delete().catch(() => {});
      userChannels.delete(ownerId);
    }
  }, 15000);
}

module.exports.handlePrivatePanel = handlePrivatePanel;
module.exports.handleModal = handleModal;
