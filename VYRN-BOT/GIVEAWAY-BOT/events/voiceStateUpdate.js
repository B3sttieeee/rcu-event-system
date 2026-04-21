const { Events } = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    if (!oldState.channel && newState.channel && newState.channel.id === CREATE_CHANNEL_ID) {
      await handlePrivateChannelCreation(member);
    }
  }
};

// ====================== TWORZENIE KANAŁU ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  await new Promise(resolve => setTimeout(resolve, 5000));

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) {
    return;
  }

  try {
    const channel = await guild.channels.create({
      name: `・${member.displayName}'s Channel`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.Connect] },
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

    if (member.voice?.channel) {
      await member.voice.setChannel(channel).catch(() => {});
    }

    await channel.send({
      content: `> **${member}** Twój prywatny kanał został stworzony!`
    }).catch(() => {});

    await sendControlPanel(channel, member);
    startEmptyChannelWatcher(channel, member.id);

  } catch (err) {
    console.error("[PrivateChannel] Create error:", err);
  }
}

// ====================== ŁADNY PANEL STEROWANIA ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔧 Panel zarządzania kanałem")
    .setDescription(
      `> **Właściciel:** ${owner}\n` +
      `> **Kanał:** <#${channel.id}>\n\n` +
      `Zarządzaj swoim prywatnym kanałem za pomocą menu poniżej.`
    )
    .addFields(
      { name: "━━━━━━━━━━━━━━━━━━", value: "**Dostępne akcje:**", inline: false },
      { name: "✏️ Zmiana nazwy", value: "Zmień nazwę kanału", inline: true },
      { name: "👥 Limit osób", value: "Ustaw maksymalną liczbę osób", inline: true },
      { name: "🚪 Wyrzuć", value: "Wyrzuć kogoś z kanału", inline: true },
      { name: "🔨 Ban", value: "Zbanuj użytkownika", inline: true },
      { name: "🔓 Unban", value: "Odbanuj użytkownika", inline: true },
      { name: "🔒 Lock / Unlock", value: "Zablokuj lub odblokuj kanał", inline: true }
    )
    .setThumbnail(owner.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ 
      text: "VYRN • Private Channel System", 
      iconURL: owner.guild.iconURL({ dynamic: true }) 
    })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Wybierz akcję...")
    .addOptions([
      { label: "Zmiana nazwy kanału", value: "rename", emoji: "✏️" },
      { label: "Zmiana limitu osób", value: "limit", emoji: "👥" },
      { label: "Wyrzuć użytkownika", value: "kick", emoji: "🚪" },
      { label: "Zbanuj użytkownika", value: "ban", emoji: "🔨" },
      { label: "Odbanuj użytkownika", value: "unban", emoji: "🔓" },
      { label: "Zablokuj kanał", value: "lock", emoji: "🔒" },
      { label: "Odblokuj kanał", value: "unlock", emoji: "🔓" },
      { label: "Usuń kanał", value: "delete", emoji: "🗑️" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  await channel.send({ embeds: [embed], components: [row] });
}

// ====================== AUTOMATYCZNE USUWANIE PUSTEGO KANAŁU ======================
function startEmptyChannelWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    try {
      const freshChannel = await channel.guild.channels.fetch(channel.id).catch(() => null);
      if (!freshChannel || freshChannel.members.size === 0) {
        await freshChannel?.delete().catch(() => {});
        userChannels.delete(ownerId);
        clearInterval(interval);
      }
    } catch (e) {
      clearInterval(interval);
      userChannels.delete(ownerId);
    }
  }, 15000);
}
