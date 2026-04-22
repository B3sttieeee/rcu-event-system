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

const userChannels = new Map(); // ownerId -> channelId
const channelOwners = new Map(); // channelId -> ownerId
const channelBans = new Map();

console.log("[PrivateVC] System loaded");

// ====================== CREATE VC ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (!member.voice?.channel) return;
  if (member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  console.log(`[PrivateVC] Triggered for ${member.user.tag}`);

  try {
    // already exists
    if (userChannels.has(member.id)) {
      const existing = guild.channels.cache.get(userChannels.get(member.id));
      if (existing) {
        await member.voice.setChannel(existing).catch(() => {});
        return;
      }
    }

    const channel = await guild.channels.create({
      name: `・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      permissionOverwrites: [
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
          ]
        }
      ]
    });

    userChannels.set(member.id, channel.id);
    channelOwners.set(channel.id, member.id);

    // IMPORTANT: wait before move (fix bug)
    setTimeout(async () => {
      await member.voice.setChannel(channel).catch(console.error);
    }, 800);

    await sendPanel(channel, member);

    startWatcher(channel.id);

  } catch (err) {
    console.error("[VC CREATE ERROR]", err);
  }
}

// ====================== PANEL ======================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VC PANEL")
    .setDescription(
      `👑 Owner: ${owner}\n🎧 <#${channel.id}>`
    );

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

  await channel.send({ embeds: [embed], components: [row1, row2] });
}

// ====================== BUTTON HANDLER ======================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ No channel", ephemeral: true });

  const ownerId = channelOwners.get(channelId);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ Not owner", ephemeral: true });
  }

  // LOCK
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });
    return interaction.reply({ content: "🔒 Locked", ephemeral: true });
  }

  // UNLOCK
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });
    return interaction.reply({ content: "🔓 Unlocked", ephemeral: true });
  }

  // DELETE
  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(ownerId);
    channelOwners.delete(channelId);
    return interaction.reply({ content: "🗑️ Deleted", ephemeral: true });
  }

  // MODALS
  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_rename_${channelId}`)
      .setTitle("Rename VC");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("Name")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_limit_${channelId}`)
      .setTitle("Limit VC");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("1-99")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
}

// ====================== MODALS ======================
async function handleRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("value");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(value);
  return interaction.reply({ content: "✏️ Renamed", ephemeral: true });
}

async function handleLimit(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = Number(interaction.fields.getTextInputValue("value"));

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setUserLimit(value);
  return interaction.reply({ content: "👥 Updated", ephemeral: true });
}

// ====================== WATCHER FIX ======================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = await global.client?.channels?.fetch(channelId).catch(() => null);
    if (!channel) return clearInterval(interval);

    if (channel.members.size === 0) {
      const owner = channelOwners.get(channelId);
      await channel.delete().catch(() => {});

      if (owner) userChannels.delete(owner);
      channelOwners.delete(channelId);

      clearInterval(interval);
    }
  }, 15000);
}

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handleRename,
  handleLimit
};
