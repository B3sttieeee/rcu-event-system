// =====================================================
// PRIVATE VC SYSTEM - HYBRID MODULAR
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
const userChannels = new Map();     // ownerId → channelId
const channelOwners = new Map();    // channelId → ownerId
const creatingUsers = new Set();    // anti-spam
const channelBans = new Map();      // channelId → Set<userId>

// ====================== CREATE PRIVATE CHANNEL ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;
  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);

  try {
    // Usuń stare kanały użytkownika jeśli istnieją
    const oldId = userChannels.get(member.id);
    if (oldId) {
      const oldChannel = guild.channels.cache.get(oldId);
      if (oldChannel) {
        await member.voice.setChannel(oldChannel).catch(() => {});
        return cooldown(member.id);
      }
      userChannels.delete(member.id);
    }

    const channel = await guild.channels.create({
      name: `🔒・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      bitrate: 64000,
      permissionOverwrites: [
        { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Speak, PermissionFlagsBits.Stream,
            PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels
          ]
        }
      ]
    });

    userChannels.set(member.id, channel.id);
    channelOwners.set(channel.id, member.id);

    setTimeout(async () => {
      if (member.voice?.channel?.id === CREATE_CHANNEL_ID) {
        await member.voice.setChannel(channel).catch(() => {});
      }
    }, MOVE_DELAY);

    await sendPanel(channel, member);
    startWatcher(channel.id);

  } catch (err) {
    console.error("[PRIVATE VC] Create error:", err);
  }

  cooldown(member.id);
}

// ====================== PANEL + BUTTONS ======================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      `> 👑 **Owner:** ${owner}\n` +
      `> 🎧 **Channel:** <#${channel.id}>\n` +
      `> 👥 **Limit:** 10 Users\n\n` +
      `### ⚙️ Available Options:`
    )
    .setFooter({ text: "Advanced Private VC System" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("Rename").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("Limit").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setLabel("Lock").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setLabel("Unlock").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_kick_${channel.id}`).setLabel("Kick User").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_ban_${channel.id}`).setLabel("Ban User").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Unban All").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Delete").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row1, row2] }).catch(() => {});
}

// ====================== HANDLERS ======================
async function handlePrivatePanel(interaction) { /* ... cały kod z oryginalnego pliku ... */ }
async function handlePrivateSelect(interaction) { /* ... cały kod z oryginalnego pliku ... */ }
async function handleRename(interaction) { /* ... cały kod z oryginalnego pliku ... */ }
async function handleLimit(interaction) { /* ... cały kod z oryginalnego pliku ... */ }

function startWatcher(channelId) { /* ... cały kod z oryginalnego pliku ... */ }
function cleanup(channelId) { /* ... cały kod z oryginalnego pliku ... */ }
function cooldown(userId) { /* ... cały kod z oryginalnego pliku ... */ }

// ====================== INIT ======================
function init(client) {
  console.log("🔒 Private VC System → załadowany");
  // Nie ma potrzeby dodatkowych eventów – wszystko idzie przez voiceStateUpdate
}

module.exports = {
  init,
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateSelect,
  handleRename,
  handleLimit
};
