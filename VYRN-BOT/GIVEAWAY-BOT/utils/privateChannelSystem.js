const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";   // Kanał, na który ktoś wchodzi
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

// ====================== AUTOMATYCZNE TWORZENIE KANAŁU ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  // Limit 1 kanał na użytkownika
  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  // Czekamy 5 sekund
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Sprawdzamy czy nadal jest na kanale tworzenia
  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) {
    return; // Wyszedł zanim minęło 5 sekund
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

    // Automatyczne przeniesienie na nowy kanał
    if (member.voice?.channel) {
      await member.voice.setChannel(channel).catch(() => {});
    }

    // Ping osoby + informacja
    await channel.send({
      content: `> **${member}** Twój prywatny kanał został stworzony!`
    }).catch(() => {});

    // Wysyłamy ładny panel sterowania
    await sendControlPanel(channel, member);

    // Watcher usuwania pustego kanału
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
      { name: "━━━━━━━━━━━━━━━━━━", value: "**Dostępne opcje:**", inline: false },
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
        console.log(`[PrivateChannel] Kanał ${channel.name} został usunięty (pusty)`);
      }
    } catch (e) {
      clearInterval(interval);
      userChannels.delete(ownerId);
    }
  }, 15000);
}

module.exports = {
  handlePrivateChannelCreation
};
