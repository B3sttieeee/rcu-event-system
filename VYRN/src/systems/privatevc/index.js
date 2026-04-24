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
  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);
  setTimeout(() => creatingUsers.delete(member.id), CREATE_COOLDOWN);

  try {
    // Usuń starą sesję jeśli istnieje
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
        {
          id: member.guild.id,
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

    // Przenieś użytkownika
    setTimeout(() => {
      if (member.voice?.channel?.id === CREATE_CHANNEL_ID) {
        member.voice.setChannel(channel).catch(() => {});
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

// ====================== PANEL HANDLER ======================
async function handlePrivatePanel(interaction) {
  const customId = interaction.customId;
  const [action, channelId] = customId.split("_").slice(1);

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

  const ownerId = channelOwners.get(channelId);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ To nie twój kanał.", ephemeral: true });
  }

  // Lock / Unlock
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
    return interaction.reply({ content: "🔒 Kanał zablokowany.", ephemeral: true });
  }
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
    return interaction.reply({ content: "🔓 Kanał odblokowany.", ephemeral: true });
  }

  // Delete
  if (action === "delete") {
    await channel.delete().catch(() => {});
    cleanup(channelId);
    return interaction.reply({ content: "🗑️ Kanał usunięty.", ephemeral: true });
  }

  // Rename Modal
  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_rename_${channelId}`)
      .setTitle("Zmiana nazwy kanału");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Nowa nazwa")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }

  // Limit Modal
  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_limit_${channelId}`)
      .setTitle("Ustaw limit użytkowników");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("limit")
          .setLabel("Limit (1-99)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }

  // Kick / Ban menus
  if (action === "kick" || action === "ban") {
    const members = Array.from(channel.members.values())
      .filter(m => m.id !== ownerId)
      .slice(0, 25);

    if (!members.length) {
      return interaction.reply({ content: "❌ Brak użytkowników do wyrzucenia/banowania.", ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vc_${action}select_${channelId}`)
      .setPlaceholder(action === "kick" ? "Wybierz użytkownika do kicka" : "Wybierz użytkownika do bana")
      .addOptions(members.map(m => ({
        label: m.user.username,
        value: m.id
      })));

    return interaction.reply({
      content: action === "kick" ? "👢 Wybierz użytkownika do wyrzucenia:" : "🔨 Wybierz użytkownika do zbanowania:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  if (action === "unban") {
    channelBans.delete(channelId);
    return interaction.reply({ content: "🔓 Wszystkie bany zostały usunięte.", ephemeral: true });
  }
}

// ====================== SELECT HANDLER ======================
async function handlePrivateSelect(interaction) {
  const [_, type, channelId] = interaction.customId.split("_");
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const targetId = interaction.values[0];
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) return;

  if (type === "kickselect") {
    await target.voice.disconnect().catch(() => {});
    return interaction.update({ content: `👢 Wyrzucono ${target.user.tag}`, components: [] });
  }

  if (type === "banselect") {
    if (!channelBans.has(channelId)) channelBans.set(channelId, new Set());
    channelBans.get(channelId).add(targetId);

    await channel.permissionOverwrites.edit(targetId, { Connect: false }).catch(() => {});
    await target.voice.disconnect().catch(() => {});

    return interaction.update({ content: `🔨 Zbanowano ${target.user.tag}`, components: [] });
  }
}

// ====================== MODALS ======================
async function handleRename(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const newName = interaction.fields.getTextInputValue("name");
  const channel = interaction.guild.channels.cache.get(channelId);
  if (channel) await channel.setName(newName).catch(() => {});
  return interaction.reply({ content: "✅ Nazwa zmieniona.", ephemeral: true });
}

async function handleLimit(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const limit = parseInt(interaction.fields.getTextInputValue("limit"));
  if (isNaN(limit) || limit < 1 || limit > 99) {
    return interaction.reply({ content: "❌ Limit musi być od 1 do 99.", ephemeral: true });
  }
  const channel = interaction.guild.channels.cache.get(channelId);
  if (channel) await channel.setUserLimit(limit).catch(() => {});
  return interaction.reply({ content: `👥 Limit ustawiony na ${limit}.`, ephemeral: true });
}

// ====================== WATCHER ======================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = interaction.client?.channels?.cache.get(channelId); // lepiej użyć client z init
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
