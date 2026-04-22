const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map();

async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (userChannels.has(member.id)) {
    const old = guild.channels.cache.get(userChannels.get(member.id));

    if (old?.voiceId) {
      await member.voice.setChannel(old.voiceId).catch(() => {});
      return;
    }

    userChannels.delete(member.id);
  }

  await wait(5000);

  if (!member.voice.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  try {
    const voice = await guild.channels.create({
      name: `${member.displayName} Room`,
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

    const text = await guild.channels.create({
      name: `${member.displayName}-panel`,
      type: ChannelType.GuildText,
      parent: PRIVATE_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ]
    });

    userChannels.set(member.id, {
      voiceId: voice.id,
      textId: text.id
    });

    await member.voice.setChannel(voice).catch(() => {});

    await sendPanel(text, member, voice);

    startEmptyWatcher(guild, member.id);
  } catch (err) {
    console.error(err);
  }
}

async function sendPanel(channel, member, voice) {
  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🔒 Private Channel Panel")
    .setDescription(
      `👑 Owner: ${member}\n🎤 Voice: <#${voice.id}>\n\nChoose option below.`
    )
    .setFooter({ text: "Private Channel System" });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_${voice.id}`)
    .setPlaceholder("Choose action")
    .addOptions([
      { label: "Rename Channel", value: "rename", emoji: "✏️" },
      { label: "Change Limit", value: "limit", emoji: "👥" },
      { label: "Lock Channel", value: "lock", emoji: "🔒" },
      { label: "Unlock Channel", value: "unlock", emoji: "🔓" },
      { label: "Delete Channel", value: "delete", emoji: "🗑️" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  await channel.send({
    embeds: [embed],
    components: [row]
  });
}

async function handlePrivatePanel(interaction) {
  const voiceId = interaction.customId.split("_")[1];
  const action = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(voiceId);

  if (!channel) {
    return interaction.reply({
      content: "❌ Channel not found.",
      ephemeral: true
    });
  }

  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`private_rename_${voiceId}`)
      .setTitle("Rename Channel");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("New channel name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return await interaction.showModal(modal);
  }

  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`private_limit_${voiceId}`)
      .setTitle("Channel Limit");

    const input = new TextInputBuilder()
      .setCustomId("limit")
      .setLabel("Enter limit 1-99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return await interaction.showModal(modal);
  }

  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false
    });

    return interaction.reply({
      content: "🔒 Channel locked.",
      ephemeral: true
    });
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true
    });

    return interaction.reply({
      content: "🔓 Channel unlocked.",
      ephemeral: true
    });
  }

  if (action === "delete") {
    await channel.delete().catch(() => {});
    return interaction.reply({
      content: "🗑️ Channel deleted.",
      ephemeral: true
    });
  }
}

async function handlePrivateRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const name = interaction.fields.getTextInputValue("name");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(name);

  return interaction.reply({
    content: "✏️ Name changed.",
    ephemeral: true
  });
}

async function handlePrivateLimit(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = parseInt(
    interaction.fields.getTextInputValue("limit")
  );

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setUserLimit(value);

  return interaction.reply({
    content: `👥 Limit changed to ${value}.`,
    ephemeral: true
  });
}

function startEmptyWatcher(guild, userId) {
  const interval = setInterval(async () => {
    const data = userChannels.get(userId);
    if (!data) return clearInterval(interval);

    const voice = await guild.channels.fetch(data.voiceId).catch(() => null);
    const text = await guild.channels.fetch(data.textId).catch(() => null);

    if (!voice) {
      text?.delete().catch(() => {});
      userChannels.delete(userId);
      return clearInterval(interval);
    }

    if (voice.members.size === 0) {
      await voice.delete().catch(() => {});
      await text?.delete().catch(() => {});
      userChannels.delete(userId);
      clearInterval(interval);
    }
  }, 15000);
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateRename,
  handlePrivateLimit
};
