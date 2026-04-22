const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  Events
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

console.log("[PrivateChannel] System uruchomiony");
userChannels.clear();

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // wejście na kanał create-to-voice
    if (
      !oldState.channel &&
      newState.channel &&
      newState.channel.id === CREATE_CHANNEL_ID
    ) {
      await handleCreate(member);
    }
  }
};

// ===================== CREATE CHANNEL =====================
async function handleCreate(member) {
  const guild = member.guild;

  // anty duplikaty
  if (userChannels.has(member.id)) {
    const old = guild.channels.cache.get(userChannels.get(member.id));
    if (old) {
      await member.voice.setChannel(old).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  await wait(5000);

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID)
    return;

  try {
    const channel = await guild.channels.create({
      name: `・${member.displayName}'s Channel`,
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

    await channel.send({
      content: `> 👑 ${member} Twój prywatny kanał został utworzony!`
    });

    await sendPanel(channel, member);
    startWatcher(channel, member.id);

  } catch (err) {
    console.error("[CREATE ERROR]", err);
  }
}

// ===================== PANEL (NA VOICE CHANNELU) =====================
async function sendPanel(channel, member) {
  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🔒 Private Voice Panel")
    .setDescription(
      `👑 Owner: ${member}\n` +
      `🎤 Channel: <#${channel.id}>\n\n` +
      `Wybierz akcję poniżej`
    )
    .setFooter({ text: "Private Voice System" });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Wybierz akcję")
    .addOptions([
      { label: "Rename", value: "rename", emoji: "✏️" },
      { label: "Limit", value: "limit", emoji: "👥" },
      { label: "Lock", value: "lock", emoji: "🔒" },
      { label: "Unlock", value: "unlock", emoji: "🔓" },
      { label: "Delete", value: "delete", emoji: "🗑️" }
    ]);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

// ===================== INTERACTION HANDLER =====================
async function handleInteraction(interaction) {
  if (!interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  // ================= MENU =================
  if (interaction.isStringSelectMenu()) {
    const channelId = interaction.customId.split("_")[2];
    const action = interaction.values[0];

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: "❌ No channel", ephemeral: true });

    if (action === "rename") {
      const modal = new ModalBuilder()
        .setCustomId(`private_rename_${channel.id}`)
        .setTitle("Rename Channel");

      const input = new TextInputBuilder()
        .setCustomId("value")
        .setLabel("New name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (action === "limit") {
      const modal = new ModalBuilder()
        .setCustomId(`private_limit_${channel.id}`)
        .setTitle("Set Limit");

      const input = new TextInputBuilder()
        .setCustomId("value")
        .setLabel("1-99")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (action === "lock") {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: false
      });

      return interaction.reply({ content: "🔒 Locked", ephemeral: true });
    }

    if (action === "unlock") {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        Connect: true
      });

      return interaction.reply({ content: "🔓 Unlocked", ephemeral: true });
    }

    if (action === "delete") {
      userChannels.delete(getOwner(channel.id));
      await channel.delete().catch(() => {});
      return interaction.reply({ content: "🗑️ Deleted", ephemeral: true });
    }
  }

  // ================= MODALS =================
  if (interaction.isModalSubmit()) {
    const [type, action, channelId] = interaction.customId.split("_");
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return;

    const value = interaction.fields.getTextInputValue("value");

    if (action === "rename") {
      await channel.setName(value);
      return interaction.reply({ content: "✏️ Renamed", ephemeral: true });
    }

    if (action === "limit") {
      await channel.setUserLimit(parseInt(value));
      return interaction.reply({ content: "👥 Limit set", ephemeral: true });
    }
  }
}

// ===================== WATCHER =====================
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

// ===================== HELPERS =====================
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// (opcjonalnie jeśli chcesz ownership stabilny)
function getOwner(channelId) {
  for (const [userId, chId] of userChannels) {
    if (chId === channelId) return userId;
  }
  return null;
}

// ===================== EXPORT =====================
module.exports.handleInteraction = handleInteraction;
