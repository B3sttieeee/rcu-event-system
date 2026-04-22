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

console.log("[PrivateChannel] System uruchomiony - mapa userChannels wyczyszczona");
userChannels.clear();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const member = newState.member;
    if (!member || member.user.bot) return;

    console.log(`[VoiceDebug] ${member.user.tag} | ${oldState.channel?.id || 'none'} → ${newState.channel?.id || 'none'}`);

    if (!oldState.channel && newState.channel && newState.channel.id === CREATE_CHANNEL_ID) {
      console.log(`[PrivateChannel] ROZPOCZYNAM TWORZENIE dla ${member.user.tag}`);
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

  await new Promise(r => setTimeout(r, 5000));

  if (!member.voice?.channel || member.voice.channel.id !== CREATE_CHANNEL_ID) {
    console.log(`[PrivateChannel] Użytkownik wyszedł przed 5s - anuluję`);
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

    await member.voice.setChannel(channel).catch(() => {});

    await channel.send({
      content: `> **${member}** Twój prywatny kanał został stworzony!`
    }).catch(() => {});

    await sendControlPanel(channel, member);
    startEmptyChannelWatcher(channel, member.id);

    console.log(`[PrivateChannel] Kanał stworzony pomyślnie: ${channel.name}`);

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

  // Modale dla rename i limit
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

  // Kick, Ban, Unban – dynamiczne menu
  if (action === "kick" || action === "ban" || action === "unban") {
    return await showUserSelectMenu(interaction, channel, action);
  }

  // Pozostałe akcje
  await interaction.deferUpdate().catch(() => {});

  if (action === "lock") {
    await channel.permissionOverwrites.edit(channel.guild.id, { Connect: false });
    await interaction.followUp({ content: "🔒 Kanał zablokowany.", ephemeral: true });
  } else if (action === "unlock") {
    await channel.permissionOverwrites.edit(channel.guild.id, { Connect: null });
    await interaction.followUp({ content: "🔓 Kanał odblokowany.", ephemeral: true });
  } else if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);
    await interaction.followUp({ content: "🗑️ Kanał został usunięty.", ephemeral: true });
  }
}

// ====================== DYNAMICZNE MENU DLA KICK/BAN/UNBAN ======================
async function showUserSelectMenu(interaction, channel, action) {
  let options = [];

  if (action === "kick" || action === "ban") {
    options = Array.from(channel.members.values())
      .filter(m => m.id !== interaction.user.id)
      .map(m => ({
        label: m.displayName || m.user.username,
        value: m.id,
        description: m.user.tag
      }));
  } else if (action === "unban") {
    const banned = channel.permissionOverwrites.cache.filter(perm =>
      perm.type === 1 && perm.deny.has(PermissionFlagsBits.Connect)
    );
    options = banned.map(perm => {
      const member = interaction.guild.members.cache.get(perm.id);
      return {
        label: member ? (member.displayName || member.user.username) : "Nieznany",
        value: perm.id,
        description: "Zbanowany"
      };
    });
  }

  if (options.length === 0) {
    return interaction.reply({
      content: action === "unban" ? "✅ Nie ma zbanowanych osób." : "❌ Na kanale nie ma nikogo innego.",
      ephemeral: true
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`private_${action}_user_${channel.id}`)
    .setPlaceholder(`Wybierz kogo ${action === "kick" ? "wyrzucić" : action === "ban" ? "zbanować" : "odbanować"}`)
    .addOptions(options.slice(0, 25));

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: `Wybierz użytkownika do **${action === "kick" ? "wyrzucenia" : action === "ban" ? "zbanowania" : "odbanowania"}**:`,
    components: [row],
    ephemeral: true
  });
}

// ====================== OBSŁUGA AKCJI NA UŻYTKOWNIKU ======================
async function handlePrivateUserAction(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const channelId = parts[3];
  const targetId = interaction.values[0];
  const channel = interaction.guild.channels.cache.get(channelId);

  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

  await interaction.deferUpdate().catch(() => {});

  try {
    if (action === "kick") {
      const member = await interaction.guild.members.fetch(targetId).catch(() => null);
      if (member) await member.voice.disconnect().catch(() => {});
      await interaction.followUp({ content: `🚪 Wyrzucono użytkownika.`, ephemeral: true });
    } else if (action === "ban") {
      await channel.permissionOverwrites.edit(targetId, { Connect: false });
      await interaction.followUp({ content: `🔨 Użytkownik zbanowany na kanale.`, ephemeral: true });
    } else if (action === "unban") {
      await channel.permissionOverwrites.delete(targetId).catch(() => {});
      await interaction.followUp({ content: `🔓 Użytkownik odbanowany.`, ephemeral: true });
    }
  } catch (err) {
    console.error(`[PrivateUserAction] Błąd ${action}:`, err);
    await interaction.followUp({ content: "❌ Nie udało się wykonać akcji.", ephemeral: true });
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
  handlePrivatePanel,
  handlePrivateUserAction   // <--- DODANE – to było brakujące!
};
