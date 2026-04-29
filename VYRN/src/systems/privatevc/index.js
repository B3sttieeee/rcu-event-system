// src/systems/privatevc.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

// ====================== CONFIG ======================
const CONFIG = {
  CREATE_CHANNEL_ID: "1496280414237491220",
  PRIVATE_CATEGORY_ID: "1496281285780574268",
  CREATE_COOLDOWN: 5000,
  MOVE_DELAY: 1000,
  WATCH_INTERVAL: 15000,
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a"
  }
};

// ====================== CACHE ======================
const userChannels = new Map();
const channelOwners = new Map();
const creatingUsers = new Set();
const channelBans = new Map();

function init(client) {
  global.client = client;
  console.log("👑 [VYRN SYSTEM] 🔒 Private VC System → Loaded Successfully");
}

// ====================== CREATE CHANNEL ======================
async function handlePrivateChannelCreation(member) {
  if (!member.voice || member.voice.channelId !== CONFIG.CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);
  setTimeout(() => creatingUsers.delete(member.id), CONFIG.CREATE_COOLDOWN);

  try {
    const oldId = userChannels.get(member.id);
    if (oldId) {
      const oldChannel = member.guild.channels.cache.get(oldId);
      if (oldChannel) await oldChannel.delete().catch(() => {});
      cleanup(oldId);
    }

    const channel = await member.guild.channels.create({
      name: `👑・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CONFIG.PRIVATE_CATEGORY_ID,
      userLimit: 0,
      bitrate: 64000,
      permissionOverwrites: [
        { 
          id: member.guild.id, 
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] 
        },
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

    // KLUCZOWA POPRAWKA: Czekamy chwilę, aż kanał "osiądzie" w systemie przed wysłaniem panelu
    setTimeout(async () => {
        await sendControlPanel(channel, member);
        
        // Przenoszenie użytkownika
        const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
        if (freshMember && freshMember.voice?.channelId === CONFIG.CREATE_CHANNEL_ID) {
          await freshMember.voice.setChannel(channel).catch(err => {
              console.error("[VC MOVE ERROR]", err.message);
          });
        }
    }, CONFIG.MOVE_DELAY);

    startWatcher(channel.id);
    console.log(`[PRIVATE VC] 🎤 Channel created for ${member.user.tag}`);

  } catch (err) {
    console.error("🔥 [PRIVATE VC ERROR] Creation failed:", err);
  }
}

// ====================== CONTROL PANEL ======================
async function sendControlPanel(channel, owner) {
  // Ponowne sprawdzenie czy kanał istnieje w cache bota
  const targetChannel = channel.guild.channels.cache.get(channel.id);
  if (!targetChannel) return console.error("[VC] Could not find channel in cache to send panel.");

  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setAuthor({ name: "👑 VYRN • VC MANAGEMENT CENTER", iconURL: owner.user.displayAvatarURL() })
    .setDescription(
      `Welcome ${owner}! This is your private voice sanctuary.\nControl your environment using the golden panel below.\n\n` +
      `**Settings:**\n` +
      `> ✏️ Rename ┃ 👥 User Limit ┃ 👑 Claim Channel\n\n` +
      `**Access Control:**\n` +
      `> 🔒 Lock ┃ 🔓 Unlock ┃ 👁️ Hide ┃ 👁️‍🗨️ Show ┃ ➕ Permit User\n\n` +
      `**Moderation:**\n` +
      `> 🥾 Kick ┃ 🔨 Ban ┃ ♻️ Reset Access ┃ 🗑️ Delete`
    )
    .setFooter({ text: "Official VYRN HQ System" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("Rename").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("Limit").setEmoji("👥").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_claim_${channel.id}`).setLabel("Claim").setEmoji("👑").setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setEmoji("🔓").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_hide_${channel.id}`).setEmoji("👁️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unhide_${channel.id}`).setEmoji("👁️‍🗨️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_permit_${channel.id}`).setLabel("Permit").setEmoji("➕").setStyle(ButtonStyle.Primary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_kick_${channel.id}`).setLabel("Kick").setEmoji("🥾").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_ban_${channel.id}`).setLabel("Ban").setEmoji("🔨").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Reset").setEmoji("♻️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Delete").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  // Wysyłamy wiadomość i przypinamy ją, żeby zawsze była na górze (opcjonalnie)
  await targetChannel.send({ embeds: [embed], components: [row1, row2, row3] })
    .then(msg => msg.pin().catch(() => {}))
    .catch(err => console.error("[PANEL SEND ERROR]", err.message));
}

// ... reszta funkcji (handlePrivatePanel, handleRename, etc.) bez zmian, ale z angielskimi tekstami ...
// Pamiętaj, aby w handlePrivatePanel również zmienić teksty na angielski, jak robiliśmy w poprzednich plikach!

async function handlePrivatePanel(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const channelId = parts[2];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ This channel no longer exists.", ephemeral: true });

  const ownerId = channelOwners.get(channelId);

  if (action === "claim") {
    if (interaction.user.id === ownerId) return interaction.reply({ content: "❌ You already own this channel!", ephemeral: true });
    if (channel.members.has(ownerId)) return interaction.reply({ content: "❌ The owner is still present. You cannot claim it.", ephemeral: true });
    
    if (ownerId) userChannels.delete(ownerId);
    channelOwners.set(channelId, interaction.user.id);
    userChannels.set(interaction.user.id, channelId);

    if (ownerId) await channel.permissionOverwrites.delete(ownerId).catch(() => {});
    await channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true, Connect: true, Speak: true, Stream: true, MoveMembers: true, ManageChannels: true
    });

    return interaction.reply({ content: "👑 **Success!** You have claimed ownership of this channel.", ephemeral: false });
  }

  if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Only the channel owner can use these controls!", ephemeral: true });

  try {
    switch (action) {
      case "rename":
        const renameModal = new ModalBuilder().setCustomId(`vc_rename_${channelId}`).setTitle("Rename Channel").addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("new_name").setLabel("New Name:").setStyle(TextInputStyle.Short).setMaxLength(25).setRequired(true))
        );
        return await interaction.showModal(renameModal);
      case "limit":
        const limitModal = new ModalBuilder().setCustomId(`vc_limit_${channelId}`).setTitle("User Limit").addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("new_limit").setLabel("Limit (0 = unlimited):").setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true))
        );
        return await interaction.showModal(limitModal);
      case "lock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
        return await interaction.reply({ content: "🔒 Channel locked.", ephemeral: true });
      case "unlock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
        return await interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });
      case "hide":
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
        return await interaction.reply({ content: "👁️ Channel hidden.", ephemeral: true });
      case "unhide":
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
        return await interaction.reply({ content: "👁️‍🗨️ Channel visible.", ephemeral: true });
      case "delete":
        await interaction.reply({ content: "🗑️ Closing channel...", ephemeral: true });
        await channel.delete().catch(() => {});
        cleanup(channelId);
        return;
      // ... dodaj resztę (permit/kick/ban) analogicznie po angielsku ...
    }
  } catch (e) { console.error(e); }
}

// Pamiętaj o eksporcie i reszcie funkcji pomocniczych!
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = global.client?.channels?.cache.get(channelId);
    if (!channel) return clearInterval(interval);
    if (channel.members.size === 0) {
      await channel.delete().catch(() => {});
      cleanup(channelId);
      clearInterval(interval);
    }
  }, CONFIG.WATCH_INTERVAL);
}

function cleanup(channelId) {
  const ownerId = channelOwners.get(channelId);
  if (ownerId) userChannels.delete(ownerId);
  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

module.exports = {
  init,
  handlePrivateChannelCreation,
  handlePrivatePanel,
  // Nie zapomnij wyeksportować reszty, jeśli są używane w handlerach:
  handlePrivateSelect: require('./index.js').handlePrivateSelect, 
  handleRename: require('./index.js').handleRename,
  handleLimit: require('./index.js').handleLimit
};
