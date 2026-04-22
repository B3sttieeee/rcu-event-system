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

const userChannels = new Map();
const bannedUsers = new Map();

console.log("[PRIVATE VC] System loaded");
userChannels.clear();

// ===================== MAIN CREATE =====================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  const newChannel = member.voice.channel;
  if (!newChannel || newChannel.id !== CREATE_CHANNEL_ID) return;

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
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers
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

// ===================== PANEL =====================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VC PANEL")
    .setDescription(
      `Owner: ${owner.user.tag}\nChannel: ${channel.name}\n\nSelect action below.`
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Select action")
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

// ===================== EXPORT FIX (TO BYŁ TWÓJ BUG) =====================
module.exports = {
  handlePrivateChannelCreation
};
