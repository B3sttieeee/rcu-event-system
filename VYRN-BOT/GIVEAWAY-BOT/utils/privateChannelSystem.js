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

console.log("[PrivateChannel] SYSTEM STARTED");
userChannels.clear();

// ===================== VOICE EVENT =====================
module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // JOIN CREATE CHANNEL
    const joinedCreate =
      !oldState.channel &&
      newState.channel &&
      newState.channel.id === CREATE_CHANNEL_ID;

    if (joinedCreate) {
      await createChannel(member);
      return;
    }

    // BLOCK BANNED USERS FROM ENTERING
    if (newState.channel) {
      const banned = bannedUsers.get(newState.channel.id);
      if (banned?.has(member.id)) {
        await member.voice.setChannel(null).catch(() => {});
      }
    }
  }
};

// ===================== CREATE CHANNEL =====================
async function createChannel(member) {
  const guild = member.guild;

  // anti duplicate
  if (userChannels.has(member.id)) {
    const old = guild.channels.cache.get(userChannels.get(member.id));
    if (old) return member.voice.setChannel(old).catch(() => {});
    userChannels.delete(member.id);
  }

  await wait(4000);

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

  await sendPanel(channel, member);
  startWatcher(channel, member.id);
}

// ===================== PANEL (BLACK UI) =====================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0d0d0d")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      [
        `👑 Owner: ${owner}`,
        `🎧 Channel: <#${channel.id}>`,
        ``,
        `⚙️ Control system active`,
        `────────────────────`
      ].join("\n")
    )
    .addFields(
      {
        name: "🛠 CHANNEL",
        value: "✏️ Rename\n👥 Limit\n🔒 Lock\n🔓 Unlock\n🗑 Delete",
        inline: false
      },
      {
        name: "🛡 USERS",
        value: "🚪 Kick\n🔨 Ban\n🔓 Unban",
        inline: false
      }
    )
    .setFooter({ text: "Private Voice System • Black UI" })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Select action...")
    .addOptions([
      { label: "Rename", value: "rename", emoji: "✏️" },
      { label: "Limit", value: "limit", emoji: "👥" },
      { label: "Kick User", value: "kick", emoji: "🚪" },
      { label: "Ban User", value: "ban", emoji: "🔨" },
      { label: "Unban User", value: "unban", emoji: "🔓" },
      { label: "Lock", value: "lock", emoji: "🔒" },
      { label: "Unlock", value: "unlock", emoji: "🔓" },
      { label: "Delete", value: "delete", emoji: "🗑️" }
    ]);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

// ===================== PANEL HANDLER =====================
async function handlePrivatePanel(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const ownerId = getOwner(channelId);

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "❌ Not your channel",
      ephemeral: true
    });
  }

  const action = interaction.values[0];

  // ===== MODALS =====
  if (action === "rename" || action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`private_${action}_${channel.id}`)
      .setTitle(action === "rename" ? "Rename" : "Limit");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel(action === "rename" ? "New name" : "1-99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  // ===== KICK =====
  if (action === "kick") {
    const target = pickUser(channel, interaction.user.id);
    if (!target) return reply(interaction, "No user to kick");

    await target.voice.setChannel(null).catch(() => {});
    return reply(interaction, `🚪 Kicked ${target.user.tag}`);
  }

  // ===== BAN =====
  if (action === "ban") {
    const target = pickUser(channel, interaction.user.id);
    if (!target) return reply(interaction, "No user to ban");

    if (!bannedUsers.has(channel.id)) {
      bannedUsers.set(channel.id, new Set());
    }

    bannedUsers.get(channel.id).add(target.id);

    await channel.permissionOverwrites.edit(target.id, {
      Connect: false
    });

    await target.voice.setChannel(null).catch(() => {});

    return reply(interaction, `🔨 Banned ${target.user.tag}`);
  }

  // ===== UNBAN =====
  if (action === "unban") {
    const set = bannedUsers.get(channel.id);
    if (!set || set.size === 0) {
      return reply(interaction, "No banned users");
    }

    const userId = [...set][0];
    set.delete(userId);

    await channel.permissionOverwrites.edit(userId, {
      Connect: true
    });

    return reply(interaction, `🔓 Unbanned <@${userId}>`);
  }

  // ===== LOCK =====
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });
    return reply(interaction, "🔒 Locked");
  }

  // ===== UNLOCK =====
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });
    return reply(interaction, "🔓 Unlocked");
  }

  // ===== DELETE =====
  if (action === "delete") {
    userChannels.delete(ownerId);
    await channel.delete().catch(() => {});
    return reply(interaction, "🗑 Deleted");
  }
}

// ===================== MODALS =====================
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
    return reply(interaction, "👥 Updated");
  }
}

// ===================== HELPERS =====================
function pickUser(channel, ownerId) {
  const members = [...channel.members.values()];
  return members.find(m => m.id !== ownerId);
}

function getOwner(channelId) {
  for (const [owner, ch] of userChannels) {
    if (ch === channelId) return owner;
  }
  return null;
}

function reply(interaction, msg) {
  return interaction.reply({ content: msg, ephemeral: true });
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function startWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    const fresh = await channel.guild.channels.fetch(channel.id).catch(() => null);

    if (!fresh || fresh.members.size === 0) {
      await fresh?.delete().catch(() => {});
      userChannels.delete(ownerId);
      clearInterval(interval);
    }
  }, 15000);
}

module.exports.handlePrivatePanel = handlePrivatePanel;
module.exports.handleModal = handleModal;
