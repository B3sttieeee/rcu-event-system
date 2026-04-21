const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

// Czyszczenie po restarcie
console.log("[PrivateChannel] System uruchomiony - mapa wyczyszczona");
userChannels.clear();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // Log do debugowania
    if (newState.channel?.id === CREATE_CHANNEL_ID && !oldState.channel) {
      console.log(`[PrivateChannel] Użytkownik ${member.user.tag} (${member.id}) dołączył do kanału tworzenia`);
    }

    if (!oldState.channel && newState.channel && newState.channel.id === CREATE_CHANNEL_ID) {
      console.log(`[PrivateChannel] Rozpoczynam tworzenie kanału dla ${member.user.tag}`);
      await handlePrivateChannelCreation(member);
    }
  }
};

// ====================== TWORZENIE KANAŁU ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  // Czyszczenie martwych wpisów
  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      console.log(`[PrivateChannel] Użytkownik ma już aktywny kanał - przenoszę`);
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  // 5 sekund czekania
  console.log(`[PrivateChannel] Czekam 5 sekund dla ${member.user.tag}...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Sprawdzenie czy nadal jest na kanale tworzenia
  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) {
    console.log(`[PrivateChannel] Użytkownik wyszedł zanim minęło 5s - anuluję`);
    return;
  }

  try {
    console.log(`[PrivateChannel] Tworzę kanał dla ${member.user.tag}...`);

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
    console.log(`[PrivateChannel] Kanał stworzony: ${channel.name} (${channel.id})`);

    // Przeniesienie użytkownika
    await member.voice.setChannel(channel).catch(err => {
      console.log(`[PrivateChannel] Nie udało się przenieść użytkownika: ${err.message}`);
    });

    // Wiadomość powitalna
    await channel.send({
      content: `> **${member}** Twój prywatny kanał został stworzony!\nZarządzaj nim za pomocą menu poniżej.`
    }).catch(() => {});

    await sendControlPanel(channel, member);
    startEmptyChannelWatcher(channel, member.id);

  } catch (err) {
    console.error(`[PrivateChannel] Błąd tworzenia kanału dla ${member.user.tag}:`, err);
  }
}

// ====================== PANEL STEROWANIA ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔧 Panel zarządzania prywatnym kanałem")
    .setDescription(`**Właściciel:** ${owner}\nZarządzaj swoim kanałem poniżej.`)
    .setThumbnail(owner.user.displayAvatarURL({ dynamic: true }))
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
  await channel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

// ====================== USUWANIE PUSTEGO KANAŁU ======================
function startEmptyChannelWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    try {
      const fresh = await channel.guild.channels.fetch(channel.id).catch(() => null);
      if (!fresh || fresh.members.size === 0) {
        await fresh?.delete().catch(() => {});
        userChannels.delete(ownerId);
        clearInterval(interval);
        console.log(`[PrivateChannel] Kanał ${channel.name} usunięty (pusty)`);
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
