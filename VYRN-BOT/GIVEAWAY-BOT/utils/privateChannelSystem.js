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

console.log("[PrivateChannel] System uruchomiony - mapa userChannels wyczyszczona");
userChannels.clear();

// ====================== TWORZENIE KANAŁU ======================
async function handlePrivateChannelCreation(member) {
  const guild = member.guild;

  console.log(`[PrivateChannel] handlePrivateChannelCreation wywołane dla ${member.user.tag}`);

  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      console.log(`[PrivateChannel] Użytkownik ma już kanał - przenoszę`);
      await member.voice.setChannel(existing).catch(() => {});
      return;
    }
    userChannels.delete(member.id);
  }

  await new Promise(r => setTimeout(r, 5000));

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) {
    console.log(`[PrivateChannel] Użytkownik wyszedł przed 5s - anuluję`);
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

    await member.voice.setChannel(channel).catch(() => {});

    console.log(`[PrivateChannel] Kanał stworzony pomyślnie: ${channel.name} (ID: ${channel.id})`);

    await channel.send({
      content: `> **${member}** Twój prywatny kanał został stworzony!`
    }).catch(() => {});

    await sendControlPanel(channel, member);
    startEmptyChannelWatcher(channel, member.id);

  } catch (err) {
    console.error(`[PrivateChannel] Błąd tworzenia dla ${member.user.tag}:`, err);
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

// ====================== OBSŁUGA PANELU ======================
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

  await interaction.deferUpdate().catch(() => {});

  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);
    await interaction.followUp({ content: "🗑️ Kanał został usunięty.", ephemeral: true });
  } else {
    await interaction.followUp({
      content: `✅ Wybrano akcję: **${action}**`,
      ephemeral: true
    });
  }
}

// ====================== AUTOMATYCZNE USUWANIE PUSTEGO KANAŁU ======================
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
  handlePrivateChannelCreation,
  handlePrivatePanel
};
