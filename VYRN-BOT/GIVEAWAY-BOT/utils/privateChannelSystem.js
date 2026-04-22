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

const userChannels = new Map();      // ownerId => channelId
const bannedUsers = new Map();       // channelId => Set(userId)

console.log("[PRIVATE VC] System loaded");

// ===================== CREATE VOICE =====================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  const voice = member.voice.channel;
  if (!voice || voice.id !== CREATE_CHANNEL_ID) return;

  // anti duplicate
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

// ===================== DARK PANEL =====================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      [
        "```css",
        "PRIVATE VC SYSTEM ACTIVE",
        "```",
        "",
        `👑 Owner: ${owner.user.tag}`,
        `🎧 Channel: ${channel.name}`,
        "",
        "Use buttons below to manage your voice room."
      ].join("\n")
    )
    .setFooter({ text: "Dark VC System • Premium UI" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("Rename").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("Limit").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setLabel("Lock").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setLabel("Unlock").setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_kick_${channel.id}`).setLabel("Kick").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_ban_${channel.id}`).setLabel("Ban").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Unban").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Delete").setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `${owner}`,
    embeds: [embed],
    components: [row1, row2]
  });
}

// ===================== BUTTON HANDLER =====================
async function handlePrivateButton(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const owner = getOwner(channelId);

  if (interaction.user.id !== owner) {
    return interaction.reply({ content: "❌ Not owner", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  // LOCK / UNLOCK
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });
    return interaction.editReply("🔒 Locked");
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });
    return interaction.editReply("🔓 Unlocked");
  }

  // KICK
  if (action === "kick") {
    const target = [...channel.members.values()].find(m => m.id !== owner);
    if (target) await target.voice.setChannel(null).catch(() => {});
    return interaction.editReply("🚪 Kicked user");
  }

  // BAN
  if (action === "ban") {
    const target = [...channel.members.values()].find(m => m.id !== owner);
    if (!target) return interaction.editReply("No user");

    if (!bannedUsers.has(channelId)) bannedUsers.set(channelId, new Set());
    bannedUsers.get(channelId).add(target.id);

    await target.voice.setChannel(null).catch(() => {});
    return interaction.editReply("🔨 Banned user");
  }

  // UNBAN
  if (action === "unban") {
    const set = bannedUsers.get(channelId);
    if (!set || !set.size) return interaction.editReply("No banned users");

    const id = [...set][0];
    set.delete(id);

    return interaction.editReply(`🔓 Unbanned <@${id}>`);
  }

  // DELETE
  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(owner);
    return interaction.editReply("🗑 Deleted");
  }

  // MODALS
  if (action === "rename") {
    return showRename(interaction, channelId);
  }

  if (action === "limit") {
    return showLimit(interaction, channelId);
  }
}

// ===================== MODALS =====================
async function showRename(interaction, channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`private_rename_${channelId}`)
    .setTitle("Rename Channel");

  const input = new TextInputBuilder()
    .setCustomId("value")
    .setLabel("New name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

async function showLimit(interaction, channelId) {
  const modal = new ModalBuilder()
    .setCustomId(`private_limit_${channelId}`)
    .setTitle("Set Limit");

  const input = new TextInputBuilder()
    .setCustomId("value")
    .setLabel("1-99")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

// ===================== MODAL HANDLERS =====================
async function handlePrivateRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("value");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(value);
  return interaction.reply({ content: "✏️ Renamed", ephemeral: true });
}

async function handlePrivateLimit(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = parseInt(interaction.fields.getTextInputValue("value"));

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setUserLimit(value);
  return interaction.reply({ content: "👥 Updated", ephemeral: true });
}

// ===================== OWNER FINDER =====================
function getOwner(channelId) {
  for (const [owner, id] of userChannels) {
    if (id === channelId) return owner;
  }
  return null;
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

// ===================== EXPORT =====================
module.exports = {
  handlePrivateChannelCreation,
  handlePrivateButton,
  handlePrivateRename,
  handlePrivateLimit
};
