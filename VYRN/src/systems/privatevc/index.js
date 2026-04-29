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
  MOVE_DELAY: 1500, // Zwiększyłem lekko dla stabilności Discord API
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
  console.log("👑 [VYRN HQ] 🔒 Private VC System → OK");
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

    // Czekamy chwilę przed akcjami, żeby uniknąć API limitów
    setTimeout(async () => {
        await sendControlPanel(channel, member);
        
        const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
        if (freshMember && freshMember.voice?.channelId === CONFIG.CREATE_CHANNEL_ID) {
          await freshMember.voice.setChannel(channel).catch(err => {
              console.error("🔥 [VC MOVE ERROR]", err.message);
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
  const targetChannel = channel.guild.channels.cache.get(channel.id);
  if (!targetChannel) return;

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

  await targetChannel.send({ embeds: [embed], components: [row1, row2, row3] })
    .catch(err => console.error("[PANEL SEND ERROR]", err.message));
}

// ====================== BUTTON HANDLER ======================
async function handlePrivatePanel(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const channelId = parts[2];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ This channel no longer exists.", flags: 64 });

  const ownerId = channelOwners.get(channelId);

  // Claim logic (Available for everyone)
  if (action === "claim") {
    if (interaction.user.id === ownerId) return interaction.reply({ content: "❌ You already own this channel!", flags: 64 });
    if (channel.members.has(ownerId)) return interaction.reply({ content: "❌ The owner is still present. You cannot claim it.", flags: 64 });
    
    if (ownerId) userChannels.delete(ownerId);
    channelOwners.set(channelId, interaction.user.id);
    userChannels.set(interaction.user.id, channelId);

    if (ownerId) await channel.permissionOverwrites.delete(ownerId).catch(() => {});
    await channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true, Connect: true, Speak: true, Stream: true, MoveMembers: true, ManageChannels: true
    });

    return interaction.reply({ content: "👑 **Success!** You have claimed ownership of this channel.", flags: 64 });
  }

  // Owner-only check
  if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Only the channel owner can use these controls!", flags: 64 });

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
        return await interaction.reply({ content: "🔒 Channel locked.", flags: 64 });
        
      case "unlock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
        return await interaction.reply({ content: "🔓 Channel unlocked.", flags: 64 });
        
      case "hide":
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
        return await interaction.reply({ content: "👁️ Channel hidden.", flags: 64 });
        
      case "unhide":
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
        return await interaction.reply({ content: "👁️‍🗨️ Channel visible.", flags: 64 });
        
      case "delete":
        await interaction.reply({ content: "🗑️ Closing channel...", flags: 64 });
        await channel.delete().catch(() => {});
        cleanup(channelId);
        return;

      // Select Menus for Mod Actions
      case "permit":
      case "kick":
      case "ban":
      case "unban":
        const menu = new UserSelectMenuBuilder()
          .setCustomId(`vc_select_${action}_${channelId}`)
          .setPlaceholder(`Select user to ${action}...`)
          .setMaxValues(1);
        const row = new ActionRowBuilder().addComponents(menu);
        return await interaction.reply({ content: `Select a user to **${action}**:`, components: [row], flags: 64 });
    }
  } catch (e) { console.error("🔥 [VC PANEL ERROR]", e); }
}

// ====================== MODAL HANDLERS ======================
async function handleRename(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Channel not found.", flags: 64 });
  if (channelOwners.get(channelId) !== interaction.user.id) return interaction.reply({ content: "❌ Unauthorized.", flags: 64 });

  const newName = interaction.fields.getTextInputValue("new_name");
  await channel.setName(newName).catch(() => {});
  return interaction.reply({ content: `✅ Channel renamed to: **${newName}**`, flags: 64 });
}

async function handleLimit(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Channel not found.", flags: 64 });
  if (channelOwners.get(channelId) !== interaction.user.id) return interaction.reply({ content: "❌ Unauthorized.", flags: 64 });

  let limit = parseInt(interaction.fields.getTextInputValue("new_limit"));
  if (isNaN(limit) || limit < 0 || limit > 99) limit = 0;
  await channel.setUserLimit(limit).catch(() => {});
  return interaction.reply({ content: `✅ User limit set to: **${limit === 0 ? "Unlimited" : limit}**`, flags: 64 });
}

// ====================== SELECT MENU HANDLER ======================
async function handlePrivateSelect(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[2];
  const channelId = parts[3];
  const targetId = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Channel not found.", flags: 64 });
  if (channelOwners.get(channelId) !== interaction.user.id) return interaction.reply({ content: "❌ Unauthorized.", flags: 64 });

  const targetMember = interaction.guild.members.cache.get(targetId);
  if (!targetMember) return interaction.reply({ content: "❌ User not found on server.", flags: 64 });

  try {
    switch (action) {
      case "permit":
        await channel.permissionOverwrites.edit(targetId, { ViewChannel: true, Connect: true });
        return interaction.reply({ content: `✅ Granted access to ${targetMember}.`, flags: 64 });
      
      case "kick":
        if (targetMember.voice.channelId === channelId) await targetMember.voice.disconnect().catch(() => {});
        return interaction.reply({ content: `🥾 Kicked ${targetMember} from the channel.`, flags: 64 });
        
      case "ban":
        if (targetMember.voice.channelId === channelId) await targetMember.voice.disconnect().catch(() => {});
        await channel.permissionOverwrites.edit(targetId, { Connect: false, ViewChannel: false });
        let bans = channelBans.get(channelId) || new Set();
        bans.add(targetId);
        channelBans.set(channelId, bans);
        return interaction.reply({ content: `🔨 Banned ${targetMember} from the channel.`, flags: 64 });
        
      case "unban":
        await channel.permissionOverwrites.delete(targetId).catch(() => {});
        let existingBans = channelBans.get(channelId);
        if (existingBans) existingBans.delete(targetId);
        return interaction.reply({ content: `♻️ Reset access for ${targetMember}.`, flags: 64 });
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: "❌ Error executing action.", flags: 64 });
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
  }, CONFIG.WATCH_INTERVAL);
}

function cleanup(channelId) {
  const ownerId = channelOwners.get(channelId);
  if (ownerId) userChannels.delete(ownerId);
  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

// ====================== EXPORTS ======================
module.exports = {
  init,
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateSelect, 
  handleRename,
  handleLimit
};
