const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

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

  // czekaj 5 sekund
  await new Promise(r => setTimeout(r, 5000));

  // jeśli wyszedł z create room
  if (!member.voice.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) return;

  try {
    const channel = await guild.channels.create({
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

    userChannels.set(member.id, channel.id);

    await member.voice.setChannel(channel).catch(() => {});

    await sendPanel(member, channel);

    startEmptyWatcher(channel, member.id);
  } catch (err) {
    console.error("Błąd tworzenia kanału:", err);
  }
}

async function sendPanel(member, channel) {
  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🔒 Private Channel Panel")
    .setDescription(
      `Twój kanał: <#${channel.id}>\n\nWybierz opcję z menu.`
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_${channel.id}`)
    .setPlaceholder("Wybierz opcję")
    .addOptions([
      { label: "Rename", value: "rename", emoji: "✏️" },
      { label: "Limit", value: "limit", emoji: "👥" },
      { label: "Delete", value: "delete", emoji: "🗑️" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  await member.send({
    embeds: [embed],
    components: [row]
  }).catch(() => {});
}

async function handlePrivatePanel(interaction) {
  const channelId = interaction.customId.split("_")[1];
  const action = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) {
    return interaction.reply({
      content: "❌ Kanał nie istnieje.",
      ephemeral: true
    });
  }

  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);

    return interaction.reply({
      content: "🗑️ Kanał usunięty.",
      ephemeral: true
    });
  }

  if (action === "rename") {
    await channel.setName(`${interaction.user.username} Room`);

    return interaction.reply({
      content: "✏️ Zmieniono nazwę.",
      ephemeral: true
    });
  }

  if (action === "limit") {
    await channel.setUserLimit(5);

    return interaction.reply({
      content: "👥 Limit ustawiony na 5.",
      ephemeral: true
    });
  }
}

function startEmptyWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    const fresh = await channel.guild.channels.fetch(channel.id).catch(() => null);

    if (!fresh) {
      clearInterval(interval);
      userChannels.delete(ownerId);
      return;
    }

    if (fresh.members.size === 0) {
      await fresh.delete().catch(() => {});
      userChannels.delete(ownerId);
      clearInterval(interval);
    }
  }, 15000);
}

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel
};
```

---

## `events/voiceStateUpdate.js`

```js
const { Events } = require("discord.js");
const { handlePrivateChannelCreation } = require("../utils/privateChannelSystem");

const CREATE_CHANNEL_ID = "1496280414237491220";

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    if (
      newState.channel &&
      newState.channel.id === CREATE_CHANNEL_ID &&
      oldState.channel?.id !== CREATE_CHANNEL_ID
    ) {
      await handlePrivateChannelCreation(member);
    }
  }
};
```

---

## `events/interactionCreate.js`

```js
const { Events } = require("discord.js");
const { handlePrivatePanel } = require("../utils/privateChannelSystem");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("private_")) {
        await handlePrivatePanel(interaction);
      }
    }
  }
};
