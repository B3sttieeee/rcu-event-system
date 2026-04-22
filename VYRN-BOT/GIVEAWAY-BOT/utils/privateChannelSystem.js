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
    const oldChannel = guild.channels.cache.get(userChannels.get(member.id));

    if (oldChannel) {
      await member.voice.setChannel(oldChannel).catch(() => {});
      return;
    }

    userChannels.delete(member.id);
  }

  await wait(5000);

  if (!member.voice.channel) return;
  if (member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  try {
    const channel = await guild.channels.create({
      name: `・${member.displayName}'s Channel`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [
            PermissionFlagsBits.Connect
          ]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        {
          id: guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.EmbedLinks
          ]
        }
      ]
    });

    userChannels.set(member.id, channel.id);

    await member.voice.setChannel(channel).catch(() => {});

    await sendControlPanel(channel, member);

    startEmptyWatcher(channel, member.id);
  } catch (err) {
    console.error("[PRIVATE CHANNEL ERROR]", err);
  }
}

async function sendControlPanel(channel, member) {
  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("🔒 Private Channel Panel")
    .setDescription(
      `👑 Owner: ${member}\n` +
      `🎤 Channel: <#${channel.id}>\n\n` +
      `Choose an option below.`
    )
    .setFooter({ text: "Private Channel System" });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Select action...")
    .addOptions([
      {
        label: "Rename Channel",
        value: "rename",
        emoji: "✏️"
      },
      {
        label: "Change Limit",
        value: "limit",
        emoji: "👥"
      },
      {
        label: "Lock Channel",
        value: "lock",
        emoji: "🔒"
      },
      {
        label: "Unlock Channel",
        value: "unlock",
        emoji: "🔓"
      },
      {
        label: "Delete Channel",
        value: "delete",
        emoji: "🗑️"
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  await channel.send({
    content: `${member}`,
    embeds: [embed],
    components: [row]
  }).catch(console.error);
}

async function handlePrivatePanel(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const action = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    return interaction.reply({
      content: "❌ Channel not found.",
      ephemeral: true
    });
  }

  if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`private_rename_${channel.id}`)
      .setTitle("Rename Channel");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("New channel name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }

  if (action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`private_limit_${channel.id}`)
      .setTitle("Change Limit");

    const input = new TextInputBuilder()
      .setCustomId("limit")
      .setLabel("Enter limit 1-99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }

  if (action === "lock") {
    await channel.permissionOverwrites.edit(
      interaction.guild.id,
      {
        Connect: false
      }
    );

    return interaction.reply({
      content: "🔒 Channel locked.",
      ephemeral: true
    });
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(
      interaction.guild.id,
      {
        Connect: true
      }
    );

    return interaction.reply({
      content: "🔓 Channel unlocked.",
      ephemeral: true
    });
  }

  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);

    return interaction.reply({
      content: "🗑️ Channel deleted.",
      ephemeral: true
    });
  }
}

async function handlePrivateRename(interaction) {
  const id = interaction.customId.split("_")[2];
  const value = interaction.fields.getTextInputValue("name");

  const channel = interaction.guild.channels.cache.get(id);
  if (!channel) return;

  await channel.setName(value);

  return interaction.reply({
    content: "✏️ Channel renamed.",
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
    content: `👥 Limit set to ${value}.`,
    ephemeral: true
  });
}

function startEmptyWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    const fresh = await channel.guild.channels
      .fetch(channel.id)
      .catch(() => null);

    if (!fresh) {
      userChannels.delete(ownerId);
      clearInterval(interval);
      return;
    }

    if (fresh.members.size === 0) {
      await fresh.delete().catch(() => {});
      userChannels.delete(ownerId);
      clearInterval(interval);
    }
  }, 15000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateRename,
  handlePrivateLimit
};
