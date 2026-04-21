const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const CREATE_CHANNEL_ID = "1496280414237491220"; // Kanał z przyciskiem "Create Channel"
const PRIVATE_CATEGORY_ID = "TUTAJ_WSTAW_ID_KATEGORII"; // ← ZMIEŃ NA ID TWOJEJ KATEGORII (Private Channels)

// Mapa: userId → channelId
const userChannels = new Map();

// ====================== CREATE PRIVATE CHANNEL ======================
async function createPrivateChannel(member) {
  const guild = member.guild;

  // Sprawdź czy użytkownik już ma kanał
  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      return { success: false, message: "❌ Masz już swój prywatny kanał!" };
    }
    userChannels.delete(member.id); // czyszczenie martwego wpisu
  }

  try {
    const channel = await guild.channels.create({
      name: `・${member.displayName}'s Channel`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 99, // tymczasowo wysokie, potem zmieniamy przez panel
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

    // Wysyłamy panel sterowania
    await sendControlPanel(channel, member);

    // Uruchamiamy watcher usuwania kanału gdy wszyscy wyjdą
    startChannelWatcher(channel, member.id);

    return { success: true, channel };

  } catch (err) {
    console.error("[PrivateChannel] Create error:", err);
    return { success: false, message: "❌ Nie udało się stworzyć kanału." };
  }
}

// ====================== CONTROL PANEL ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔧 Panel zarządzania kanałem")
    .setDescription(`**Właściciel:** ${owner}\nZarządzaj swoim prywatnym kanałem poniżej.`)
    .addFields(
      { name: "Kanał", value: `<#${channel.id}>`, inline: true },
      { name: "Typ", value: "Voice Channel", inline: true }
    );

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

// ====================== WATCHER - USUWANIE KANAŁU GDY PUŚTY ======================
function startChannelWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    try {
      const freshChannel = await channel.guild.channels.fetch(channel.id).catch(() => null);
      if (!freshChannel) {
        clearInterval(interval);
        userChannels.delete(ownerId);
        return;
      }

      // Jeśli nikt nie jest na kanale → usuwamy
      if (freshChannel.members.size === 0) {
        await freshChannel.delete().catch(() => {});
        userChannels.delete(ownerId);
        clearInterval(interval);
        console.log(`[PrivateChannel] Kanał ${channel.name} został usunięty (pusty)`);
      }
    } catch (err) {
      clearInterval(interval);
      userChannels.delete(ownerId);
    }
  }, 10000); // sprawdzaj co 10 sekund
}

module.exports = {
  createPrivateChannel
};
