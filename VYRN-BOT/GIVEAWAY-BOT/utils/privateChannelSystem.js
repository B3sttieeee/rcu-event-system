const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map();      // ownerId -> channelId
const channelOwners = new Map();     // channelId -> ownerId
const creatingUsers = new Set();     // anti spam create lock

console.log("[PrivateVC] Loaded");

// =====================================================
// CREATE PRIVATE CHANNEL (5 SEC COOLDOWN / NO BUG LOOP)
// =====================================================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (!member.voice?.channel) return;
  if (member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  // blokada spam / wielokrotnego eventu
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);

  try {
    // jeśli ma już kanał -> przenieś
    const existingId = userChannels.get(member.id);

    if (existingId) {
      const existing = guild.channels.cache.get(existingId);

      if (existing) {
        await member.voice.setChannel(existing).catch(() => {});
        setTimeout(() => creatingUsers.delete(member.id), 5000);
        return;
      } else {
        userChannels.delete(member.id);
      }
    }

    // tworzenie kanału
    const channel = await guild.channels.create({
      name: `・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect
          ]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels
          ]
        }
      ]
    });

    userChannels.set(member.id, channel.id);
    channelOwners.set(channel.id, member.id);

    // odczekaj chwilę aż discord ogarnie kanał
    setTimeout(async () => {
      if (member.voice?.channel?.id === CREATE_CHANNEL_ID) {
        await member.voice.setChannel(channel).catch(() => {});
      }
    }, 1500);

    await sendPanel(channel, member);

    startWatcher(channel.id);

  } catch (err) {
    console.error("[PRIVATE VC ERROR]", err);
  }

  // 5 sekund blokady przed kolejnym create
  setTimeout(() => {
    creatingUsers.delete(member.id);
  }, 5000);
}

// =====================================================
// PANEL
// =====================================================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#111111")
    .setTitle("🔒 PRIVATE VC")
    .setDescription(`👑 Owner: ${owner}\n🎧 <#${channel.id}>`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vc_delete_${channel.id}`)
      .setLabel("Delete")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds: [embed],
    components: [row]
  }).catch(() => {});
}

// =====================================================
// BUTTONS
// =====================================================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");

  const ownerId = channelOwners.get(channelId);

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "❌ To nie jest twój kanał.",
      ephemeral: true
    });
  }

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({
      content: "❌ Kanał nie istnieje.",
      ephemeral: true
    });
  }

  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(ownerId);
    channelOwners.delete(channelId);

    return interaction.reply({
      content: "🗑️ Kanał usunięty.",
      ephemeral: true
    });
  }
}

// =====================================================
// EMPTY CHANNEL DELETE
// =====================================================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = global.client?.channels?.cache.get(channelId);

    if (!channel) {
      clearInterval(interval);
      return;
    }

    if (channel.members.size === 0) {
      const ownerId = channelOwners.get(channelId);

      await channel.delete().catch(() => {});
      channelOwners.delete(channelId);

      if (ownerId) userChannels.delete(ownerId);

      clearInterval(interval);
    }
  }, 15000);
}

async function handleRename() {}
async function handleLimit() {}

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handleRename,
  handleLimit
};
