const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_VOICE_CHANNEL_ID = "1496280414237491220"; // Kanał, na który ktoś wchodzi, żeby stworzyć swój kanał
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

// ====================== AUTOMATYCZNE TWORZENIE KANAŁU ======================
async function handleVoiceJoin(member, channel) {
  // Sprawdzamy czy dołączył na kanał tworzenia
  if (channel.id !== CREATE_VOICE_CHANNEL_ID) return;

  // Już ma kanał?
  if (userChannels.has(member.id)) {
    const existing = member.guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      // Przenosimy go od razu na jego kanał
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  // Czekamy 5 sekund
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Sprawdzamy czy nadal jest na kanale tworzenia
  if (!member.voice?.channel || member.voice.channel.id !== CREATE_VOICE_CHANNEL_ID) {
    return; // Wyszedł zanim minęło 5 sekund
  }

  try {
    const newChannel = await member.guild.channels.create({
      name: `・${member.displayName}'s Channel`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
      permissionOverwrites: [
        { id: member.guild.id, deny: [PermissionFlagsBits.Connect] },
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

    userChannels.set(member.id, newChannel.id);

    // Przenosimy użytkownika na jego nowy kanał
    await member.voice.setChannel(newChannel).catch(() => {});

    // Wysyłamy panel sterowania
    await sendControlPanel(newChannel, member);

    // Uruchamiamy watcher usuwania pustego kanału
    startEmptyChannelWatcher(newChannel, member.id);

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
  }, 15000); // co 15 sekund
}

module.exports = {
  handleVoiceJoin
};
