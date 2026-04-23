// src/systems/privatevc/index.js
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

// ====================== SEND PANEL ======================
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

// ====================== BUTTON HANDLER ======================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");
  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    return interaction.reply({ content: "❌ Channel not found.", ephemeral: true });
  }

  const ownerId = channelOwners.get(channelId);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ This is not your channel.", ephemeral: true });
  }

  // Lock
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
    return interaction.reply({ content: "🔒 Channel locked.", ephemeral: true });
  }

  // Unlock
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
    return interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });
  }

  // Delete
  if (action === "delete") {
    await channel.delete().catch(() => {});
    cleanup(channelId);
    return interaction.reply({ content: "🗑️ Channel deleted.", ephemeral: true });
  }

  // Rename
  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_rename_${channelId}`)
      .setTitle("Rename Channel");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("New channel name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // Limit
  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_limit_${channelId}`)
      .setTitle("User Limit");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("1 - 99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // Kick
  if (action === "kick") {
    const users = channel.members
      .filter(m => m.id !== ownerId)
      .map(m => ({ label: m.user.username, value: m.id }))
      .slice(0, 25);

    if (!users.length) {
      return interaction.reply({ content: "❌ No users to kick.", ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vc_kickselect_${channelId}`)
      .setPlaceholder("Select user to kick")
      .addOptions(users);

    return interaction.reply({
      content: "👢 Select user:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // Ban
  if (action === "ban") {
    const users = channel.members
      .filter(m => m.id !== ownerId)
      .map(m => ({ label: m.user.username, value: m.id }))
      .slice(0, 25);

    if (!users.length) {
      return interaction.reply({ content: "❌ No users to ban.", ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vc_banselect_${channelId}`)
      .setPlaceholder("Select user to ban")
      .addOptions(users);

    return interaction.reply({
      content: "🔨 Select user:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // Unban All
  if (action === "unban") {
    channelBans.set(channelId, new Set());
    return interaction.reply({ content: "🔓 All banned users removed.", ephemeral: true });
  }
}

// ====================== SELECT HANDLER ======================
async function handlePrivateSelect(interaction) {
  const [_, type, channelId] = interaction.customId.split("_");
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const userId = interaction.values[0];
  const target = interaction.guild.members.cache.get(userId);
  if (!target) return;

  if (type === "kickselect") {
    await target.voice.disconnect().catch(() => {});
    return interaction.update({ content: `👢 ${target.user.tag} kicked.`, components: [] });
  }

  if (type === "banselect") {
    if (!channelBans.has(channelId)) channelBans.set(channelId, new Set());
    channelBans.get(channelId).add(userId);

    await channel.permissionOverwrites.edit(userId, { Connect: false });
    await target.voice.disconnect().catch(() => {});

    return interaction.update({ content: `🔨 ${target.user.tag} banned.`, components: [] });
  }
}

// ====================== MODAL HANDLERS ======================
async function handleRename(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("value");
  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) return;

  await channel.setName(value);
  await interaction.reply({ content: "✏️ Name updated.", ephemeral: true });
}

async function handleLimit(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const value = Number(interaction.fields.getTextInputValue("value"));

  if (isNaN(value) || value < 1 || value > 99) {
    return interaction.reply({ content: "❌ Enter number between 1-99.", ephemeral: true });
  }

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  await channel.setUserLimit(value);
  await interaction.reply({ content: `👥 Limit set to ${value}.`, ephemeral: true });
}

// ====================== WATCHER ======================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = global.client?.channels?.cache.get(channelId) || 
                    (await require("discord.js").Client.prototype.channels.fetch(channelId).catch(() => null));

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

// ====================== HELPERS ======================
function cleanup(channelId) {
  const ownerId = channelOwners.get(channelId);
  if (ownerId) userChannels.delete(ownerId);
  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

function cooldown(userId) {
  setTimeout(() => creatingUsers.delete(userId), CREATE_COOLDOWN);
}

// ====================== INIT ======================
function init(client) {
  // Zapisz klienta globalnie (potrzebne w watcherze)
  global.client = client;
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
