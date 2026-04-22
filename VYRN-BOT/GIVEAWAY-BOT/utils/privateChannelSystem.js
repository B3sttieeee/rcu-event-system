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

console.log("[PRIVATE VC] System started");
userChannels.clear();

// ===================== VOICE STATE =====================
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
      await createChannel(member);
      return;
    }

    // block banned users instantly
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

  const voice = member.voice.channel;
  if (!voice || voice.id !== CREATE_CHANNEL_ID) return;

  // anti duplicate channel
  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
  }

  try {
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

  } catch (err) {
    console.error("[PRIVATE VC ERROR]", err);
  }
}

// ===================== PREMIUM PANEL =====================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      [
        "```diff",
        "+ PRIVATE VOICE SYSTEM ONLINE",
        "- Unauthorized access prohibited",
        "```",
        "",
        `👑 Owner: ${owner.user.tag}`,
        `🎧 Channel: ${channel.name}`,
        "",
        "Select an option below to manage your channel."
      ].join("\n")
    )
    .addFields(
      {
        name: "⚙️ CHANNEL SETTINGS",
        value:
          "✏️ Rename\n" +
          "👥 Limit\n" +
          "🔒 Lock\n" +
          "🔓 Unlock\n" +
          "🗑 Delete",
        inline: false
      },
      {
        name: "🛡 USER CONTROL",
        value:
          "🚪 Kick\n" +
          "🔨 Ban\n" +
          "🔓 Unban",
        inline: false
      }
    )
    .setFooter({ text: "Private VC System • Stable Build" })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Select action...")
    .addOptions([
      { label: "Rename", value: "rename", emoji: "✏️" },
      { label: "Limit", value: "limit", emoji: "👥" },
      { label: "Kick", value: "kick", emoji: "🚪" },
      { label: "Ban", value: "ban", emoji: "🔨" },
      { label: "Unban", value: "unban", emoji: "🔓" },
      { label: "Lock", value: "lock", emoji: "🔒" },
      { label: "Unlock", value: "unlock", emoji: "🔓" },
      { label: "Delete", value: "delete", emoji: "🗑" }
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

  const owner = getOwner(channelId);

  if (interaction.user.id !== owner) {
    return interaction.reply({
      content: "❌ You are not the owner.",
      ephemeral: true
    });
  }

  const action = interaction.values[0];

  // ===== MODALS =====
  if (action === "rename" || action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`private_${action}_${channel.id}`)
      .setTitle(action === "rename" ? "Rename Channel" : "Set Limit");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel(action === "rename" ? "New name" : "Limit 1-99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  await interaction.deferUpdate();

  // ===== ACTIONS =====
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });
    return follow(interaction, "🔒 Locked");
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });
    return follow(interaction, "🔓 Unlocked");
  }

  if (action === "kick") {
    const target = pickUser(channel, owner);
    if (!target) return follow(interaction, "No user");

    await target.voice.setChannel(null).catch(() => {});
    return follow(interaction, `🚪 Kicked ${target.user.tag}`);
  }

  if (action === "ban") {
    const target = pickUser(channel, owner);
    if (!target) return follow(interaction, "No user");

    if (!bannedUsers.has(channel.id))
      bannedUsers.set(channel.id, new Set());

    bannedUsers.get(channel.id).add(target.id);
    await target.voice.setChannel(null).catch(() => {});

    return follow(interaction, `🔨 Banned ${target.user.tag}`);
  }

  if (action === "unban") {
    const set = bannedUsers.get(channel.id);
    if (!set || !set.size)
      return follow(interaction, "No banned users");

    const id = [...set][0];
    set.delete(id);

    return follow(interaction, `🔓 Unbanned <@${id}>`);
  }

  if (action === "delete") {
    userChannels.delete(owner);
    await channel.delete().catch(() => {});
    return follow(interaction, "🗑 Deleted");
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
    return follow(interaction, "✏️ Renamed");
  }

  if (action === "limit") {
    await channel.setUserLimit(parseInt(value));
    return follow(interaction, "👥 Updated");
  }
}

// ===================== HELPERS =====================
function pickUser(channel, ownerId) {
  return [...channel.members.values()].find(m => m.id !== ownerId);
}

function getOwner(channelId) {
  for (const [owner, id] of userChannels) {
    if (id === channelId) return owner;
  }
  return null;
}

function follow(interaction, msg) {
  return interaction.followUp({ content: msg, ephemeral: true });
}

// ===================== WATCHER =====================
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
