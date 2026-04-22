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

const userChannels = new Map(); // userId -> channelId
const channelBans = new Map(); // channelId -> Set(userId)

// ====================== INIT ======================
console.log("[PrivateVC] System loaded");
userChannels.clear();

// ====================== CREATE CHANNEL ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  // duplicate protection
  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      return member.voice.setChannel(existing).catch(() => {});
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

    watchEmpty(channel, member.id);

  } catch (e) {
    console.error("[PRIVATE VC CREATE ERROR]", e);
  }
}

// ====================== PANEL (DARK PREMIUM UI) ======================
async function sendPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔒 PRIVATE VOICE CONTROL PANEL")
    .setDescription(
      `**PRIVATE VC SYSTEM ACTIVE**\n\n` +
      `👑 Owner: ${owner}\n` +
      `🎧 Channel: <#${channel.id}>\n\n` +
      `Use buttons below to manage your voice room.`
    )
    .addFields({
      name: "Status",
      value: "🟢 Online • Premium Dark UI",
      inline: false
    })
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

// ====================== BUTTON HANDLER ======================
async function handlePrivatePanel(interaction) {
  const [_, action, channelId] = interaction.customId.split("_");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "Channel not found.", ephemeral: true });

  const ownerCheck = userChannels.get(interaction.user.id) === channelId;
  if (!ownerCheck) {
    return interaction.reply({ content: "Not your VC.", ephemeral: true });
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
      .setTitle("Rename VC");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("New name")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vc_limit_${channelId}`)
      .setTitle("Set Limit");

    const input = new TextInputBuilder()
      .setCustomId("value")
      .setLabel("1-99")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ================= KICK =================
  if (action === "kick") {
    const target = interaction.member.voice.channel?.members?.first();
    if (!target) return interaction.reply({ content: "No users.", ephemeral: true });

    await target.voice.disconnect().catch(() => {});
    return interaction.reply({ content: "👢 Kicked.", ephemeral: true });
  }

  // ================= BAN =================
  if (action === "ban") {
    const target = interaction.member.voice.channel?.members?.first();
    if (!target) return interaction.reply({ content: "No users.", ephemeral: true });

    if (!channelBans.has(channelId)) channelBans.set(channelId, new Set());
    channelBans.get(channelId).add(target.id);

    await target.voice.disconnect().catch(() => {});
    return interaction.reply({ content: "🔨 Banned.", ephemeral: true });
  }

  // ================= UNBAN =================
  if (action === "unban") {
    if (!channelBans.has(channelId)) return interaction.reply({ content: "No bans.", ephemeral: true });

    channelBans.get(channelId).clear();
    return interaction.reply({ content: "🔓 Unbanned all.", ephemeral: true });
  }
}

// ====================== MODALS ======================
async function handleRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("value");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(value);
  return interaction.reply({ content: "Renamed.", ephemeral: true });
}

async function handleLimit(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = Number(interaction.fields.getTextInputValue("value"));

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setUserLimit(value);
  return interaction.reply({ content: "Limit set.", ephemeral: true });
}

// ====================== WATCHER ======================
function watchEmpty(channel, ownerId) {
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
