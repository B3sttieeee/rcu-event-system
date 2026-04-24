// =====================================================
// PRIVATE VC SYSTEM - BLACK EDITION PRO
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
const userChannels = new Map();
const channelOwners = new Map();
const creatingUsers = new Set();
const channelBans = new Map();

// ====================== CREATE VC ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);

  try {
    const existingId = userChannels.get(member.id);

    if (existingId) {
      const old = guild.channels.cache.get(existingId);

      if (old) {
        await member.voice.setChannel(old).catch(() => {});
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
        {
          id: guild.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels
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
    console.error("Private VC Create Error:", err);
  }

  cooldown(member.id);
}

// ====================== PANEL ======================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0b0b0f")
    .setAuthor({
      name: "Private Voice Control Panel",
      iconURL: owner.user.displayAvatarURL()
    })
    .setDescription(
      `> 👑 Owner: **${owner.user.username}**\n` +
      `> 🎧 Channel: <#${channel.id}>\n` +
      `> 👥 Limit: **10 users**\n\n` +
      `> **Controls below**`
    )
    .setFooter({ text: "VYRN Private VC System" })
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
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Unban").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Delete").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row1, row2] }).catch(() => {});
}

// ====================== PANEL HANDLER ======================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");
  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    return interaction.reply({ content: "❌ Channel not found.", ephemeral: true });
  }

  const ownerId = channelOwners.get(channelId);

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ Not your channel.", ephemeral: true });
  }

  // LOCK
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
    return interaction.reply({ content: "🔒 Locked.", ephemeral: true });
  }

  // UNLOCK
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
    return interaction.reply({ content: "🔓 Unlocked.", ephemeral: true });
  }

  // DELETE
  if (action === "delete") {
    await channel.delete().catch(() => {});
    cleanup(channelId);
    return interaction.reply({ content: "🗑️ Deleted.", ephemeral: true });
  }

  // RENAME MODAL
  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_rename_${channelId}`)
      .setTitle("Rename Channel");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("New name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // LIMIT MODAL
  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_limit_${channelId}`)
      .setTitle("Set Limit");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("1 - 99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // KICK MENU
  if (action === "kick") {
    const users = channel.members
      .filter(m => m.id !== ownerId)
      .map(m => ({
        label: m.user.username,
        value: m.id
      }))
      .slice(0, 25);

    if (!users.length) {
      return interaction.reply({ content: "❌ No users.", ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vc_kickselect_${channelId}`)
      .setPlaceholder("Select user")
      .addOptions(users);

    return interaction.reply({
      content: "👢 Select user to kick:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // BAN MENU
  if (action === "ban") {
    const users = channel.members
      .filter(m => m.id !== ownerId)
      .map(m => ({
        label: m.user.username,
        value: m.id
      }))
      .slice(0, 25);

    if (!users.length) {
      return interaction.reply({ content: "❌ No users.", ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vc_banselect_${channelId}`)
      .setPlaceholder("Select user")
      .addOptions(users);

    return interaction.reply({
      content: "🔨 Select user to ban:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // UNBAN
  if (action === "unban") {
    channelBans.set(channelId, new Set());
    return interaction.reply({ content: "🔓 All bans cleared.", ephemeral: true });
  }
}

// ====================== SELECT ======================
async function handlePrivateSelect(interaction) {
  const [_, type, channelId] = interaction.customId.split("_");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const userId = interaction.values?.[0];
  const target = interaction.guild.members.cache.get(userId);
  if (!target) return;

  if (type === "kickselect") {
    await target.voice.disconnect().catch(() => {});
    return interaction.update({ content: `👢 Kicked ${target.user.tag}`, components: [] });
  }

  if (type === "banselect") {
    if (!channelBans.has(channelId)) channelBans.set(channelId, new Set());

    channelBans.get(channelId).add(userId);

    await channel.permissionOverwrites.edit(userId, { Connect: false });
    await target.voice.disconnect().catch(() => {});

    return interaction.update({ content: `🔨 Banned ${target.user.tag}`, components: [] });
  }
}

// ====================== WATCHER ======================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = global.client?.channels?.cache.get(channelId);
    if (!channel) return clearInterval(interval);

    if (channel.members.size === 0) {
      await channel.delete().catch(() => {});
      cleanup(channelId);
      clearInterval(interval);
    }
  }, WATCH_INTERVAL);
}

// ====================== HELPERS ======================
function cleanup(channelId) {
  const owner = channelOwners.get(channelId);

  if (owner) userChannels.delete(owner);

  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

function cooldown(userId) {
  setTimeout(() => creatingUsers.delete(userId), CREATE_COOLDOWN);
}

// ====================== INIT ======================
function init(client) {
  global.client = client;
  console.log("🖤 Private VC System (Black Edition) loaded");
}

module.exports = {
  init,
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateSelect
};
