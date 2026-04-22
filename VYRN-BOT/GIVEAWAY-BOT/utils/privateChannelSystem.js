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

    const joinedCreate =
      !oldState.channel &&
      newState.channel &&
      newState.channel.id === CREATE_CHANNEL_ID;

    if (joinedCreate) {
      await createPrivateChannel(member);
    }
  }
};

// ===================== CREATE =====================
async function createPrivateChannel(member) {
  const guild = member.guild;

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

// ===================== PANEL (BLACK PRO UI) =====================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0d0d0d")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      [
        `👑 **Owner:** ${owner}`,
        `🎧 **Channel:** <#${channel.id}>`,
        ``,
        `⚙️ **Control Panel System Active**`,
        `────────────────────────`,
        `Select action below to manage your voice room`
      ].join("\n")
    )
    .addFields(
      {
        name: "🛠️ CHANNEL MANAGEMENT",
        value:
          "✏️ Rename\n👥 Limit\n🔒 Lock/Unlock\n🗑️ Delete",
        inline: false
      },
      {
        name: "🛡️ USER CONTROL",
        value:
          "🚪 Kick user\n🔨 Ban user\n🔓 Unban user",
        inline: false
      }
    )
    .setFooter({ text: "Private Voice System • Black Panel UI" })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("⚙️ Select control action...")
    .addOptions([
      { label: "Rename Channel", value: "rename", emoji: "✏️" },
      { label: "Change Limit", value: "limit", emoji: "👥" },
      { label: "Kick User", value: "kick", emoji: "🚪" },
      { label: "Ban User", value: "ban", emoji: "🔨" },
      { label: "Unban User", value: "unban", emoji: "🔓" },
      { label: "Lock Channel", value: "lock", emoji: "🔒" },
      { label: "Unlock Channel", value: "unlock", emoji: "🔓" },
      { label: "Delete Channel", value: "delete", emoji: "🗑️" }
    ]);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

// ===================== INTERACTIONS =====================
async function handleInteraction(interaction) {
  if (!interaction.isStringSelectMenu() && !interaction.isModalSubmit())
    return;

  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const ownerId = getOwner(channelId);
  const isOwner = interaction.user.id === ownerId;

  if (!isOwner) {
    return interaction.reply({
      content: "❌ You are not the owner of this channel.",
      ephemeral: true
    });
  }

  // ================= MENU =================
  if (interaction.isStringSelectMenu()) {
    const action = interaction.values[0];

    if (action === "rename") return showModal(channel, "rename", "New name");
    if (action === "limit") return showModal(channel, "limit", "1-99");
    if (action === "kick") return kickUser(interaction, channel);
    if (action === "ban") return banUser(interaction, channel);
    if (action === "unban") return unbanUser(interaction, channel);

    if (action === "lock") {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: false
      });
      return interaction.reply({ content: "🔒 Locked", ephemeral: true });
    }

    if (action === "unlock") {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: true
      });
      return interaction.reply({ content: "🔓 Unlocked", ephemeral: true });
    }

    if (action === "delete") {
      userChannels.delete(ownerId);
      await channel.delete().catch(() => {});
      return interaction.reply({ content: "🗑️ Deleted", ephemeral: true });
    }
  }

  // ================= MODALS =================
  if (interaction.isModalSubmit()) {
    const action = interaction.customId.split("_")[1];
    const value = interaction.fields.getTextInputValue("value");

    if (action === "rename") {
      await channel.setName(value);
      return interaction.reply({ content: "✏️ Renamed", ephemeral: true });
    }

    if (action === "limit") {
      await channel.setUserLimit(parseInt(value));
      return interaction.reply({ content: "👥 Limit updated", ephemeral: true });
    }
  }
}

// ===================== USER ACTIONS =====================
async function kickUser(interaction, channel) {
  const member = interaction.member.voice?.channel?.members?.first();
  if (!member) {
    return interaction.reply({ content: "❌ No user found.", ephemeral: true });
  }

  await member.voice.setChannel(null).catch(() => {});
  return interaction.reply({ content: "🚪 Kicked user", ephemeral: true });
}

async function banUser(interaction, channel) {
  const userId = interaction.user.id;
  if (!bannedUsers.has(channel.id)) bannedUsers.set(channel.id, new Set());

  bannedUsers.get(channel.id).add(userId);

  await channel.permissionOverwrites.edit(userId, {
    Connect: false
  });

  return interaction.reply({ content: "🔨 User banned", ephemeral: true });
}

async function unbanUser(interaction, channel) {
  const userId = interaction.user.id;

  bannedUsers.get(channel.id)?.delete(userId);

  await channel.permissionOverwrites.edit(userId, {
    Connect: true
  });

  return interaction.reply({ content: "🔓 User unbanned", ephemeral: true });
}

// ===================== OWNER =====================
function getOwner(channelId) {
  for (const [owner, ch] of userChannels) {
    if (ch === channelId) return owner;
  }
  return null;
}

// ===================== WATCHER =====================
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

// ===================== HELPERS =====================
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports.handlePrivatePanel = handleInteraction;
