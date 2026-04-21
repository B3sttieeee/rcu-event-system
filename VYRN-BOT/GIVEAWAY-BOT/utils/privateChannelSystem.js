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

const CREATE_BUTTON_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";

const userChannels = new Map(); // userId => channelId

// ====================== TWORZENIE KANAŁU ======================
async function handleCreateChannel(interaction) {
  const member = interaction.member;
  const guild = interaction.guild;

  // Limit 1 kanał na użytkownika
  if (userChannels.has(member.id)) {
    const existing = guild.channels.cache.get(userChannels.get(member.id));
    if (existing) {
      return interaction.reply({
        content: "❌ Masz już swój prywatny kanał!",
        ephemeral: true
      });
    }
    userChannels.delete(member.id);
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

    // Automatyczne przeniesienie użytkownika
    if (member.voice?.channel) {
      await member.voice.setChannel(channel).catch(() => {});
    }

    await sendControlPanel(channel, member);
    startEmptyChannelWatcher(channel, member.id);

    await interaction.reply({
      content: `✅ Twój prywatny kanał został stworzony: **${channel.name}**`,
      ephemeral: true
    });

  } catch (err) {
    console.error("[PrivateChannel] Create error:", err);
    await interaction.reply({
      content: "❌ Nie udało się stworzyć kanału.",
      ephemeral: true
    });
  }
}

// ====================== PANEL STEROWANIA ======================
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

// ====================== WATCHER - USUWANIE PUSTEGO KANAŁU ======================
function startEmptyChannelWatcher(channel, ownerId) {
  const interval = setInterval(async () => {
    try {
      const freshChannel = await channel.guild.channels.fetch(channel.id).catch(() => null);
      if (!freshChannel) {
        clearInterval(interval);
        userChannels.delete(ownerId);
        return;
      }

      if (freshChannel.members.size === 0) {
        await freshChannel.delete().catch(() => {});
        userChannels.delete(ownerId);
        clearInterval(interval);
        console.log(`[PrivateChannel] Kanał ${channel.name} usunięty (pusty)`);
      }
    } catch (e) {
      clearInterval(interval);
      userChannels.delete(ownerId);
    }
  }, 15000); // co 15 sekund
}

// ====================== OBSŁUGA SELECT MENU ======================
async function handlePrivatePanel(interaction) {
  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.customId.startsWith("private_panel_")) return;

  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

  const ownerId = [...userChannels.entries()].find(([_, chId]) => chId === channelId)?.[0];
  if (ownerId !== interaction.user.id) {
    return interaction.reply({ content: "❌ Nie jesteś właścicielem tego kanału.", ephemeral: true });
  }

  const action = interaction.values[0];

  if (action === "rename" || action === "limit") {
    const modal = new ModalBuilder()
      .setCustomId(`${action}_modal_${channelId}`)
      .setTitle(action === "rename" ? "Zmiana nazwy kanału" : "Zmiana limitu osób");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(action === "rename" ? "new_name" : "new_limit")
          .setLabel(action === "rename" ? "Nowa nazwa" : "Nowy limit (1-99)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  } else if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);
    await interaction.reply({ content: "✅ Kanał został usunięty.", ephemeral: true });
  } else {
    await interaction.reply({ content: "Ta opcja jest w trakcie implementacji.", ephemeral: true });
  }
}

module.exports = {
  handleCreateChannel,
  handlePrivatePanel
};
