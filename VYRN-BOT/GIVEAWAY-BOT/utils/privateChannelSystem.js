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

// =====================================================
// CONFIG
// =====================================================
const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const CREATE_COOLDOWN = 5000; // 5 sekund
const MOVE_DELAY = 1500;
const WATCH_INTERVAL = 15000;

// =====================================================
// CACHE
// =====================================================
const userChannels = new Map();     // ownerId -> channelId
const channelOwners = new Map();    // channelId -> ownerId
const creatingUsers = new Set();    // anti spam
const channelBans = new Map();      // channelId -> Set(userId)

console.log("[PrivateVC] Advanced System Loaded");

// =====================================================
// MAIN CREATE SYSTEM
// =====================================================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (!member.voice?.channel) return;
  if (member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);

  try {
    // user already owns VC
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
      name: `・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      bitrate: 64000,
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
            PermissionFlagsBits.Stream,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels
          ]
        }
      ]
    });

    userChannels.set(member.id, channel.id);
    channelOwners.set(channel.id, member.id);

    // delay move
    setTimeout(async () => {
      if (member.voice?.channel?.id === CREATE_CHANNEL_ID) {
        await member.voice.setChannel(channel).catch(() => {});
      }
    }, MOVE_DELAY);

    await sendPanel(channel, member);

    startWatcher(channel.id);

  } catch (err) {
    console.error("[PRIVATE VC CREATE ERROR]", err);
  }

  cooldown(member.id);
}

// =====================================================
// PANEL
// =====================================================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#111111")
    .setTitle("🔒 PRIVATE VOICE PANEL")
    .setDescription(
      `👑 Owner: ${owner}\n` +
      `🎧 Channel: <#${channel.id}>\n\n` +
      `Use buttons below to manage your private voice.`
    )
    .setFooter({ text: "Advanced Private VC System" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vc_rename_${channel.id}`)
      .setLabel("Rename")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`vc_limit_${channel.id}`)
      .setLabel("Limit")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`vc_lock_${channel.id}`)
      .setLabel("Lock")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`vc_unlock_${channel.id}`)
      .setLabel("Unlock")
      .setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vc_claim_${channel.id}`)
      .setLabel("Claim")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`vc_kick_${channel.id}`)
      .setLabel("Kick All")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`vc_delete_${channel.id}`)
      .setLabel("Delete")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds: [embed],
    components: [row1, row2]
  }).catch(() => {});
}

// =====================================================
// BUTTONS
// =====================================================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({
      content: "❌ Kanał nie istnieje.",
      ephemeral: true
    });
  }

  const ownerId = channelOwners.get(channelId);

  // CLAIM
  if (action === "claim") {
    if (channel.members.has(ownerId)) {
      return interaction.reply({
        content: "❌ Owner nadal jest na kanale.",
        ephemeral: true
      });
    }

    channelOwners.set(channelId, interaction.user.id);
    userChannels.set(interaction.user.id, channelId);

    return interaction.reply({
      content: "👑 Przejęto ownership kanału.",
      ephemeral: true
    });
  }

  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "❌ To nie twój kanał.",
      ephemeral: true
    });
  }

  // LOCK
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });

    return interaction.reply({
      content: "🔒 Kanał zablokowany.",
      ephemeral: true
    });
  }

  // UNLOCK
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });

    return interaction.reply({
      content: "🔓 Kanał odblokowany.",
      ephemeral: true
    });
  }

  // DELETE
  if (action === "delete") {
    await channel.delete().catch(() => {});
    cleanup(channelId);

    return interaction.reply({
      content: "🗑️ Kanał usunięty.",
      ephemeral: true
    });
  }

  // KICK ALL
  if (action === "kick") {
    for (const [, member] of channel.members) {
      if (member.id !== ownerId) {
        await member.voice.disconnect().catch(() => {});
      }
    }

    return interaction.reply({
      content: "👢 Wyrzucono wszystkich użytkowników.",
      ephemeral: true
    });
  }

  // RENAME
  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_rename_${channelId}`)
      .setTitle("Rename Channel");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("Nowa nazwa")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // LIMIT
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
}

// =====================================================
// MODALS
// =====================================================
async function handleRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("value");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(value);

  return interaction.reply({
    content: "✏️ Nazwa zmieniona.",
    ephemeral: true
  });
}

async function handleLimit(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = Number(interaction.fields.getTextInputValue("value"));

  if (isNaN(value) || value < 1 || value > 99) {
    return interaction.reply({
      content: "❌ Podaj limit 1-99.",
      ephemeral: true
    });
  }

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setUserLimit(value);

  return interaction.reply({
    content: `👥 Limit ustawiony na ${value}.`,
    ephemeral: true
  });
}

// =====================================================
// AUTO DELETE EMPTY CHANNEL
// =====================================================
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

// =====================================================
// HELPERS
// =====================================================
function cleanup(channelId) {
  const ownerId = channelOwners.get(channelId);

  if (ownerId) userChannels.delete(ownerId);

  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

function cooldown(userId) {
  setTimeout(() => {
    creatingUsers.delete(userId);
  }, CREATE_COOLDOWN);
}

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handleRename,
  handleLimit
};
