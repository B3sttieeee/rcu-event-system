const { Events } = require("discord.js");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220";   // Kanał, na który ktoś wchodzi
const PRIVATE_CATEGORY_ID = "1496281285780574268"; // Twoja kategoria

const userChannels = new Map(); // userId => channelId

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // Ktoś dołączył do kanału tworzenia
    if (!oldState.channel && newState.channel && newState.channel.id === CREATE_CHANNEL_ID) {
      await handlePrivateChannelCreation(member);
    }
  }
};

// ====================== TWORZENIE KANAŁU ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  // Sprawdź czy już ma kanał
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
    await member.voice.setChannel(channel).catch(() => {});

    // Wysyłamy panel sterowania
    await sendControlPanel(channel, member);

    // Watcher usuwania pustego kanału
    startEmptyChannelWatcher(channel, member.id);

  } catch (err) {
    console.error("[PrivateChannel] Create error:", err);
  }
}

// ====================== PANEL STEROWANIA ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔧 Panel zarządzania kanałem")
    .setDescription(`**Właściciel:** ${owner}\nZarządzaj swoim prywatnym kanałem.`);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`private_panel_${channel.id}`)
    .setPlaceholder("Wybierz akcję...")
    .addOptions([
      { label: "Zmiana nazwy", value: "rename", emoji: "✏️" },
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
