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

const userChannels = new Map(); // userId => channelId

// ====================== CZYSZCZENIE MAPY PO RESTARCIE ======================
console.log("[PrivateChannel] System uruchomiony - mapa userChannels wyczyszczona");
userChannels.clear();

// ====================== AUTOMATYCZNE TWORZENIE KANAŁU ======================
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

// ====================== OBSŁUGA PANELU (MODALE + AKCJE) ======================
async function handlePrivatePanel(interaction) {
  await interaction.deferUpdate().catch(() => {});

  const channelId = interaction.customId.split("_")[2];
  const action = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.followUp({ content: "❌ Kanał nie istnieje.", ephemeral: true });
  }

  const isOwner = channel.permissionOverwrites.cache.some(perm =>
    perm.id === interaction.user.id && perm.allow.has(PermissionFlagsBits.ManageChannels)
  );

  if (!isOwner) {
    return interaction.followUp({ content: "❌ Nie jesteś właścicielem tego kanału.", ephemeral: true });
  }

  try {
    switch (action) {
      case "rename":
        const renameModal = new ModalBuilder()
          .setCustomId(`private_rename_${channel.id}`)
          .setTitle("Zmiana nazwy kanału");

        const nameInput = new TextInputBuilder()
          .setCustomId("new_name")
          .setLabel("Nowa nazwa kanału")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Np. Fiflak's Chill Zone")
          .setRequired(true)
          .setMaxLength(100);

        renameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));

        await interaction.showModal(renameModal);
        break;

      case "limit":
        const limitModal = new ModalBuilder()
          .setCustomId(`private_limit_${channel.id}`)
          .setTitle("Zmiana limitu osób");

        const limitInput = new TextInputBuilder()
          .setCustomId("new_limit")
          .setLabel("Nowy limit (1-99)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("10")
          .setRequired(true);

        limitModal.addComponents(new ActionRowBuilder().addComponents(limitInput));

        await interaction.showModal(limitModal);
        break;

      case "kick":
      case "ban":
      case "unban":
      case "lock":
      case "unlock":
      case "delete":
        if (action === "delete") {
          await channel.delete().catch(() => {});
          userChannels.delete(interaction.user.id);
          await interaction.followUp({ content: "🗑️ Kanał został usunięty.", ephemeral: true });
        } else {
          await interaction.followUp({
            content: `✅ Akcja **${action}** wybrana. Pełna obsługa zostanie dodana wkrótce.`,
            ephemeral: true
          });
        }
        break;
    }
  } catch (err) {
    console.error("[PrivatePanel] Błąd:", err);
    await interaction.followUp({ content: "❌ Wystąpił błąd.", ephemeral: true }).catch(() => {});
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

module.exports = {
  handlePrivateChannelCreation,
  handlePrivatePanel   // <--- Dodane, żeby interactionCreate mógł to wywołać
};
