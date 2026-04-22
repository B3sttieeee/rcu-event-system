const {
  Events,
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

const userChannels = new Map(); // userId => channelId

// ====================== INICJALIZACJA ======================
console.log("[PrivateChannel] System uruchomiony - mapa userChannels wyczyszczona");
userChannels.clear();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    // Debug log (możesz wyłączyć później)
    console.log(`[VoiceDebug] ${member.user.tag} | ${oldState.channel?.id || 'none'} → ${newState.channel?.id || 'none'}`);

    // Ktoś dołączył do kanału tworzenia prywatnego kanału
    if (!oldState.channel && newState.channel && newState.channel.id === CREATE_CHANNEL_ID) {
      console.log(`[PrivateChannel] Rozpoczynam tworzenie kanału dla ${member.user.tag}`);
      await handlePrivateChannelCreation(member);
    }
  }
};

// ====================== TWORZENIE PRYWATNEGO KANAŁU ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  // Ochrona przed duplikatami
  if (userChannels.has(member.id)) {
    const existingChannel = guild.channels.cache.get(userChannels.get(member.id));
    if (existingChannel) {
      await member.voice.setChannel(existingChannel).catch(() => {});
      console.log(`[PrivateChannel] Użytkownik ${member.user.tag} ma już aktywny kanał - przeniesiono`);
      return;
    }
    userChannels.delete(member.id); // Usuń martwy wpis
  }

  // Czekamy 5 sekund
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Sprawdzenie czy nadal jest na kanale tworzenia
  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) {
    console.log(`[PrivateChannel] Użytkownik ${member.user.tag} wyszedł przed upływem 5 sekund - anulowano`);
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

    // Automatyczne przeniesienie użytkownika na jego kanał
    await member.voice.setChannel(channel).catch(() => {
      console.log(`[PrivateChannel] Nie udało się przenieść ${member.user.tag}`);
    });

    // Powitalna wiadomość
    await channel.send({
      content: `> **${member}** Twój prywatny kanał został pomyślnie stworzony!`
    }).catch(() => {});

    // Wysyłamy panel sterowania
    await sendControlPanel(channel, member);

    // Watcher usuwania pustego kanału
    startEmptyChannelWatcher(channel, member.id);

    console.log(`[PrivateChannel] Kanał stworzony pomyślnie: ${channel.name} (${channel.id})`);

  } catch (err) {
    console.error(`[PrivateChannel] Błąd tworzenia kanału dla ${member.user.tag}:`, err);
  }
}

// ====================== PANEL STEROWANIA ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor("#0a0a0a")
    .setTitle("🔧 Panel zarządzania prywatnym kanałem")
    .setDescription(
      `> **Właściciel:** ${owner}\n` +
      `> **Kanał:** <#${channel.id}>\n\n` +
      `Wybierz akcję z menu poniżej.`
    )
    .addFields(
      { name: "━━━━━━━━━━━━━━━━━━", value: "**Dostępne akcje:**", inline: false },
      { name: "✏️ Zmiana nazwy", value: "Zmień nazwę kanału", inline: true },
      { name: "👥 Limit osób", value: "Ustaw maksymalną liczbę osób", inline: true },
      { name: "🚪 Wyrzuć", value: "Wyrzuć kogoś z kanału", inline: true },
      { name: "🔨 Ban", value: "Zbanuj użytkownika", inline: true },
      { name: "🔓 Unban", value: "Odbanuj użytkownika", inline: true },
      { name: "🔒 Lock / Unlock", value: "Zablokuj lub odblokuj kanał", inline: true },
      { name: "🗑️ Usuń kanał", value: "Usuń kanał całkowicie", inline: true }
    )
    .setThumbnail(owner.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "VYRN • Private Channel System" })
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

// ====================== OBSŁUGA PANELU (Select Menu) ======================
async function handlePrivatePanel(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const action = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
  }

  const isOwner = channel.permissionOverwrites.cache.some(perm =>
    perm.id === interaction.user.id && perm.allow.has(PermissionFlagsBits.ManageChannels)
  );

  if (!isOwner) {
    return interaction.reply({ content: "❌ Nie jesteś właścicielem tego kanału.", ephemeral: true });
  }

  try {
    if (action === "rename" || action === "limit") {
      const modal = new ModalBuilder()
        .setCustomId(`private_${action}_${channel.id}`)
        .setTitle(action === "rename" ? "Zmiana nazwy kanału" : "Zmiana limitu osób");

      const input = new TextInputBuilder()
        .setCustomId(action === "rename" ? "new_name" : "new_limit")
        .setLabel(action === "rename" ? "Nowa nazwa kanału" : "Nowy limit osób (1-99)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(action === "rename" ? "Np. Fiflak's Chill Zone" : "10")
        .setRequired(true);

      if (action === "limit") input.setMaxLength(2);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return await interaction.showModal(modal);
    }

    // Dla pozostałych akcji deferujemy
    await interaction.deferUpdate().catch(() => {});

    if (action === "delete") {
      await channel.delete().catch(() => {});
      userChannels.delete(interaction.user.id);
      await interaction.followUp({ content: "🗑️ Kanał został pomyślnie usunięty.", ephemeral: true });
    } else {
      await interaction.followUp({
        content: `✅ Wybrano akcję: **${action}**\nPełna obsługa zostanie dodana wkrótce.`,
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("[PrivatePanel] Błąd:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Wystąpił błąd.", ephemeral: true }).catch(() => {});
    }
  }
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
