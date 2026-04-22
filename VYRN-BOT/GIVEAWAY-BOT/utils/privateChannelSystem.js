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

const userChannels = new Map();
const channelBans = new Map();

console.log("[PrivateVC] System loaded");
userChannels.clear();

// ====================== CREATE VC ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (!member.voice?.channel) return;
  if (member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  try {
    const channel = await guild.channels.create({
      name: `・${member.user.username}'s VC`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.Connect]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Speak,
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
    console.error("[VC CREATE ERROR]", err);
  }
}

// ====================== PANEL ======================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      `**SYSTEM ACTIVE**\n\n` +
      `👑 Owner: ${owner}\n` +
      `🎧 Channel: <#${channel.id}>\n\n` +
      `Manage your VC using buttons below.`
    )
    .setFooter({ text: "Private VC System" });

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
    embeds: [embed],
    components: [row1, row2]
  });
}

// ====================== MAIN INTERACTION ======================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "❌ Channel not found.", ephemeral: true });
  }

  const isOwner = userChannels.get(interaction.user.id) === channelId;
  if (!isOwner) {
    return interaction.reply({ content: "❌ Not your VC.", ephemeral: true });
  }

  // ================= LOCK =================
  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });

    return interaction.reply({ content: "🔒 Locked.", ephemeral: true });
  }

  // ================= UNLOCK =================
  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });

    return interaction.reply({ content: "🔓 Unlocked.", ephemeral: true });
  }

  // ================= DELETE =================
  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);

    return interaction.reply({ content: "🗑️ Deleted.", ephemeral: true });
  }

  // ================= MODALS =================
  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_rename_${channelId}`)
      .setTitle("Rename Voice Channel");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("New channel name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_limit_${channelId}`)
      .setTitle("Set User Limit");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("Enter limit (1-99)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ================= KICK =================
  if (action === "kick") {
    const target = interaction.member.voice.channel?.members?.first();
    if (!target) {
      return interaction.reply({ content: "❌ No user found.", ephemeral: true });
    }

    await target.voice.disconnect().catch(() => {});
    return interaction.reply({ content: "👢 Kicked user.", ephemeral: true });
  }

  // ================= BAN =================
  if (action === "ban") {
    const target = interaction.member.voice.channel?.members?.first();
    if (!target) {
      return interaction.reply({ content: "❌ No user found.", ephemeral: true });
    }

    if (!channelBans.has(channelId)) channelBans.set(channelId, new Set());
    channelBans.get(channelId).add(target.id);

    await target.voice.disconnect().catch(() => {});
    return interaction.reply({ content: "🔨 Banned user.", ephemeral: true });
  }

  // ================= UNBAN =================
  if (action === "unban") {
    channelBans.set(channelId, new Set());
    return interaction.reply({ content: "🔓 All bans cleared.", ephemeral: true });
  }
}

// ====================== MODALS ======================
async function handleRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("value");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(value);
  return interaction.reply({ content: "✏️ Renamed.", ephemeral: true });
}

async function handleLimit(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = Number(interaction.fields.getTextInputValue("value"));

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setUserLimit(value);
  return interaction.reply({ content: "👥 Limit set.", ephemeral: true });
}

// ====================== WATCHER ======================
function startWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    const fresh = await channel.guild.channels.fetch(channel.id).catch(() => null);

    if (!fresh || fresh.members.size === 0) {
      await fresh?.delete().catch(() => {});
      userChannels.delete(ownerId);
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
