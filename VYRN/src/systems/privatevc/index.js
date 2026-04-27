// =====================================================
// PRIVATE VC SYSTEM - FIXED & CLEAN
// =====================================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

// ====================== CONFIG ======================
const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";
const CREATE_COOLDOWN = 5000;
const MOVE_DELAY = 1500;
const WATCH_INTERVAL = 15000;

// ====================== CACHE ======================
const userChannels = new Map();   // ownerId → channelId
const channelOwners = new Map();  // channelId → ownerId
const creatingUsers = new Set();
const channelBans = new Map();    // channelId → Set<userId>

// ====================== CREATE CHANNEL ======================
async function handlePrivateChannelCreation(member) {
  // POPRAWKA: Bezpieczne sprawdzanie channelId
  if (!member.voice || member.voice.channelId !== CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);
  setTimeout(() => creatingUsers.delete(member.id), CREATE_COOLDOWN);

  try {
    // Usuń starą sesję
    const oldId = userChannels.get(member.id);
    if (oldId) {
      const oldChannel = member.guild.channels.cache.get(oldId);
      if (oldChannel) await oldChannel.delete().catch(() => {});
      userChannels.delete(member.id);
      channelOwners.delete(oldId);
    }

    const channel = await member.guild.channels.create({
      name: `🔒・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      bitrate: 64000,
      permissionOverwrites: [
        { id: member.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { 
          id: member.id, 
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels
          ] 
        }
      ]
    });

    userChannels.set(member.id, channel.id);
    channelOwners.set(channel.id, member.id);

    // Przenieś użytkownika
    setTimeout(() => {
      // Pobieramy aktualny stan z cache, żeby mieć pewność, że nadal tam czeka
      const freshMember = member.guild.members.cache.get(member.id);
      if (freshMember && freshMember.voice?.channelId === CREATE_CHANNEL_ID) {
        freshMember.voice.setChannel(channel).catch(() => {});
      }
    }, MOVE_DELAY);

    await sendControlPanel(channel, member);
    startWatcher(channel.id);

    console.log(`[PRIVATE VC] Utworzono kanał dla ${member.user.tag}`);

  } catch (err) {
    console.error("[PRIVATE VC] Creation Error:", err);
  }
}

// ====================== CONTROL PANEL ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0b0b0f")
    .setTitle("🔒 Private Voice Control")
    .setDescription(`**Właściciel:** ${owner}\n**Kanał:** ${channel}`)
    .setFooter({ text: "VYRN Private VC" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("Rename").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("Limit").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setLabel("Lock").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setLabel("Unlock").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_kick_${channel.id}`).setLabel("Kick").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_ban_${channel.id}`).setLabel("Ban").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Unban All").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Delete").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row1, row2] }).catch(() => {});
}

// ====================== HANDLERS ======================
async function handlePrivatePanel(interaction) { /* Twój kod bez zmian */ }
async function handlePrivateSelect(interaction) { /* Twój kod bez zmian */ }
async function handleRename(interaction) { /* Twój kod bez zmian */ }
async function handleLimit(interaction) { /* Twój kod bez zmian */ }

// ====================== WATCHER ======================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = global.client?.channels?.cache.get(channelId);
    if (!channel) {
      clearInterval(interval);
      return;
    }
    if (channel.members.size === 0) {
      await channel.delete().catch(() => {});
      cleanup(channelId);
      clearInterval(interval);
    }
  }, WATCH_INTERVAL);
}

function cleanup(channelId) {
  const ownerId = channelOwners.get(channelId);
  if (ownerId) userChannels.delete(ownerId);
  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

// ====================== INIT ======================
function init(client) {
  global.client = client;   // ważne dla watchera
  console.log("🔒 Private VC System → załadowany");
}

module.exports = {
  init,
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateSelect,
  handleRename,
  handleLimit
};
