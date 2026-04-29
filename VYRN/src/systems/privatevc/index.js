// src/systems/privatevc.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

/**
 * ========================================================
 * VYRN • PRIVATE VC SYSTEM (GOLD PRESTIGE EDITION 👑)
 * ========================================================
 */

// ====================== CONFIG ======================
const CONFIG = {
  CREATE_CHANNEL_ID: "1496280414237491220",
  PRIVATE_CATEGORY_ID: "1496281285780574268",
  CREATE_COOLDOWN: 5000,
  MOVE_DELAY: 1500,
  WATCH_INTERVAL: 15000,
  THEME: {
    GOLD: "#FFD700",
    BLACK: "#0a0a0a"
  }
};

// ====================== CACHE ======================
const userChannels = new Map();   // ownerId → channelId
const channelOwners = new Map();  // channelId → ownerId
const creatingUsers = new Set();
const channelBans = new Map();    // channelId → Set<userId>

// ====================== INIT ======================
function init(client) {
  global.client = client;
  console.log("👑 [VYRN SYSTEM] 🔒 Private VC System → załadowany pomyślnie");
}

// ====================== CREATE CHANNEL ======================
async function handlePrivateChannelCreation(member) {
  if (!member.voice || member.voice.channelId !== CONFIG.CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);
  setTimeout(() => creatingUsers.delete(member.id), CONFIG.CREATE_COOLDOWN);

  try {
    // Usuń stary kanał, jeśli użytkownik jakiś posiada
    const oldId = userChannels.get(member.id);
    if (oldId) {
      const oldChannel = member.guild.channels.cache.get(oldId);
      if (oldChannel) await oldChannel.delete().catch(() => {});
      cleanup(oldId);
    }

    // Tworzenie nowego kanału
    const channel = await member.guild.channels.create({
      name: `👑・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: CONFIG.PRIVATE_CATEGORY_ID,
      userLimit: 0, // Domyślnie bez limitu
      bitrate: 64000,
      permissionOverwrites: [
        { 
          id: member.guild.id, 
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] 
        },
        { 
          id: member.id, 
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak,
            PermissionFlagsBits.Stream, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels
          ] 
        }
      ]
    });

    userChannels.set(member.id, channel.id);
    channelOwners.set(channel.id, member.id);

    // Przenoszenie użytkownika
    setTimeout(() => {
      const freshMember = member.guild.members.cache.get(member.id);
      if (freshMember && freshMember.voice?.channelId === CONFIG.CREATE_CHANNEL_ID) {
        freshMember.voice.setChannel(channel).catch(() => {});
      }
    }, CONFIG.MOVE_DELAY);

    await sendControlPanel(channel, member);
    startWatcher(channel.id);

    console.log(`[PRIVATE VC] 🎤 Utworzono kanał dla ${member.user.tag}`);

  } catch (err) {
    console.error("🔥 [PRIVATE VC ERROR] Tworzenie kanału:", err);
  }
}

// ====================== CONTROL PANEL ======================
async function sendControlPanel(channel, owner) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.THEME.GOLD)
    .setAuthor({ name: "👑 VYRN • CENTRUM ZARZĄDZANIA VC", iconURL: owner.user.displayAvatarURL() })
    .setDescription(
      `Witaj ${owner}! Oto Twój prywatny kanał głosowy.\nZarządzaj nim za pomocą poniższego złotego panelu.\n\n` +
      `**Ustawienia:**\n` +
      `> ✏️ Zmiana Nazwy ┃ 👥 Limit Osób ┃ 👑 Przejmij Kanał (Gdy właściciel wyjdzie)\n\n` +
      `**Ochrona i Dostęp:**\n` +
      `> 🔒 Zablokuj ┃ 🔓 Odblokuj ┃ 👁️ Ukryj ┃ 👁️‍🗨️ Pokaż ┃ ➕ Wpuść Osobę\n\n` +
      `**Moderacja:**\n` +
      `> 🥾 Wyrzuć ┃ 🔨 Zbanuj ┃ ♻️ Odbanuj ┃ 🗑️ Usuń Kanał`
    )
    .setFooter({ text: "Oficjalny System VYRN" })
    .setTimestamp();

  // Wiersz 1: Podstawowe ustawienia
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("Nazwa").setEmoji("✏️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("Limit").setEmoji("👥").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_claim_${channel.id}`).setLabel("Przejmij Kanał").setEmoji("👑").setStyle(ButtonStyle.Success)
  );

  // Wiersz 2: Dostęp (Lock, Hide, Permit)
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setEmoji("🔓").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_hide_${channel.id}`).setEmoji("👁️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unhide_${channel.id}`).setEmoji("👁️‍🗨️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_permit_${channel.id}`).setLabel("Wpuść").setEmoji("➕").setStyle(ButtonStyle.Primary)
  );

  // Wiersz 3: Moderacja
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_kick_${channel.id}`).setLabel("Wyrzuć").setEmoji("🥾").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_ban_${channel.id}`).setLabel("Zbanuj").setEmoji("🔨").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Odbanuj").setEmoji("♻️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Usuń").setEmoji("🗑️").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row1, row2, row3] }).catch(() => {});
}

// ====================== BUTTON HANDLER ======================
async function handlePrivatePanel(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const channelId = parts[2];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "❌ Ten kanał już nie istnieje lub wygasł.", ephemeral: true });
  }

  const ownerId = channelOwners.get(channelId);

  // Funkcja Claim - jedyna, której nie może użyć aktualny właściciel, a ktoś inny
  if (action === "claim") {
    if (interaction.user.id === ownerId) {
      return interaction.reply({ content: "❌ Jesteś już właścicielem tego kanału!", ephemeral: true });
    }
    const currentOwnerMember = channel.members.get(ownerId);
    if (currentOwnerMember) {
      return interaction.reply({ content: "❌ Właściciel nadal znajduje się na kanale. Nie możesz go przejąć.", ephemeral: true });
    }
    
    // Sukces - Przejmowanie
    if (ownerId) userChannels.delete(ownerId); // Usunięcie limitu ze starego właściciela
    channelOwners.set(channelId, interaction.user.id);
    userChannels.set(interaction.user.id, channelId);

    // Zmiana uprawnień - odbieramy staremu, dajemy nowemu
    if (ownerId) await channel.permissionOverwrites.delete(ownerId).catch(() => {});
    await channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true, Connect: true, Speak: true, Stream: true, MoveMembers: true, ManageChannels: true
    });

    return interaction.reply({ content: "👑 **Sukces!** Przejąłeś kontrolę nad tym kanałem.", ephemeral: false });
  }

  // Od tego momentu TYLKO właściciel może klikać resztę przycisków
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ Tylko właściciel kanału może używać tych ustawień!", ephemeral: true });
  }

  try {
    switch (action) {
      case "rename":
        const renameModal = new ModalBuilder()
          .setCustomId(`vc_rename_${channelId}`)
          .setTitle("Zmień nazwę kanału")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("new_name").setLabel("Nowa nazwa (bez emotek na początku):").setStyle(TextInputStyle.Short).setMaxLength(25).setRequired(true)
            )
          );
        return await interaction.showModal(renameModal);

      case "limit":
        const limitModal = new ModalBuilder()
          .setCustomId(`vc_limit_${channelId}`)
          .setTitle("Zmień limit osób")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("new_limit").setLabel("Limit (0 = bez limitu):").setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true)
            )
          );
        return await interaction.showModal(limitModal);

      case "lock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
        return await interaction.reply({ content: "🔒 Kanał zamknięty. Nikt z zewnątrz nie wbije bez zaproszenia.", ephemeral: true });

      case "unlock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
        return await interaction.reply({ content: "🔓 Kanał otwarty! Każdy może dołączyć.", ephemeral: true });

      case "hide":
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
        return await interaction.reply({ content: "👁️ Kanał jest teraz **ukryty** przed resztą serwera.", ephemeral: true });

      case "unhide":
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
        return await interaction.reply({ content: "👁️‍🗨️ Kanał jest z powrotem **widoczny**.", ephemeral: true });

      case "permit":
        const permitSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder().setCustomId(`vc_permitselect_${channelId}`).setPlaceholder("Wybierz użytkownika do wpuszczenia")
        );
        return await interaction.reply({ content: "Wybierz osobę, której chcesz dać stały dostęp (omija Lock/Hide):", components: [permitSelect], ephemeral: true });

      case "kick":
        const kickSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder().setCustomId(`vc_kickselect_${channelId}`).setPlaceholder("Wybierz kogo chcesz wyrzucić z VC")
        );
        return await interaction.reply({ content: "Wybierz osobę do wyrzucenia z Twojego kanału:", components: [kickSelect], ephemeral: true });

      case "ban":
        const banSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder().setCustomId(`vc_banselect_${channelId}`).setPlaceholder("Wybierz użytkownika do zbanowania")
        );
        return await interaction.reply({ content: "Wybierz osobę do permanentnego zablokowania na tym kanale:", components: [banSelect], ephemeral: true });

      case "unban":
        channelBans.set(channelId, new Set());
        channel.permissionOverwrites.cache.forEach(async (overwrite) => {
          if (overwrite.id !== interaction.guild.id && overwrite.id !== ownerId) {
            await overwrite.delete().catch(() => {});
          }
        });
        return await interaction.reply({ content: "✅ Wyczyszczono czarną listę! Uprawnienia kanału zresetowane.", ephemeral: true });

      case "delete":
        await interaction.reply({ content: "🗑️ Zamykanie kanału...", ephemeral: true });
        await channel.delete().catch(() => {});
        cleanup(channelId);
        return;
    }
  } catch (error) {
    console.error("🔥 [VC PANEL ERROR]:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Wystąpił błąd podczas wykonywania akcji.", ephemeral: true });
    }
  }
}

// ====================== MODAL HANDLERS (Rename / Limit) ======================
async function handleRename(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  const newName = interaction.fields.getTextInputValue("new_name");

  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

  await channel.setName(`👑・${newName}`).catch(() => {});
  return interaction.reply({ content: `✅ Kanał przemianowano na: **👑・${newName}**`, ephemeral: true });
}

async function handleLimit(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  let newLimit = parseInt(interaction.fields.getTextInputValue("new_limit"));

  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
  if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
    return interaction.reply({ content: "❌ Musisz wpisać liczbę od 0 do 99.", ephemeral: true });
  }

  await channel.setUserLimit(newLimit).catch(() => {});
  return interaction.reply({ content: `✅ Ustawiono limit miejsc na: **${newLimit === 0 ? "Brak limitu" : newLimit}**`, ephemeral: true });
}

// ====================== SELECT HANDLERS (Permit / Kick / Ban) ======================
async function handlePrivateSelect(interaction) {
  const action = interaction.customId.split("_")[1]; 
  const channelId = interaction.customId.split("_")[2];
  const targetId = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

  if (targetId === interaction.user.id) {
    return interaction.reply({ content: "❌ Nie możesz użyć tego na sobie!", ephemeral: true });
  }

  const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);

  if (action === "permitselect") {
    // Odblokowujemy możliwość zobaczenia i dołączenia konkretnej osobie
    await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });
    return interaction.update({ content: `✅ Przyznano dostęp dla **${targetMember?.user.tag || "użytkownika"}**! Może teraz wejść.`, components: [] });
  }

  if (action === "kickselect") {
    if (targetMember && targetMember.voice.channelId === channelId) {
      await targetMember.voice.disconnect("Wyrzucony z prywatnego kanału").catch(() => {});
      return interaction.update({ content: `✅ **${targetMember.user.tag}** wyleciał z kanału.`, components: [] });
    }
    return interaction.update({ content: `❌ Ten gracz nie przebywa na Twoim VC.`, components: [] });
  }

  if (action === "banselect") {
    let bans = channelBans.get(channelId) || new Set();
    bans.add(targetId);
    channelBans.set(channelId, bans);

    // Blokada wejścia i widoczności
    await channel.permissionOverwrites.edit(targetId, { Connect: false, ViewChannel: false });

    // Wyrzucenie z VC jeśli w nim siedzi
    if (targetMember && targetMember.voice.channelId === channelId) {
      await targetMember.voice.disconnect("Zbanowany na prywatnym kanale VYRN").catch(() => {});
    }

    return interaction.update({ content: `🔨 **${targetMember?.user.tag || "Użytkownik"}** dostał bana na ten kanał i go nie zobaczy.`, components: [] });
  }
}

// ====================== WATCHER (Czyszczenie pustych kanałów) ======================
function startWatcher(channelId) {
  const interval = setInterval(async () => {
    const channel = global.client?.channels?.cache.get(channelId);
    if (!channel) {
      clearInterval(interval);
      return;
    }
    // Jeśli z kanału wyszli WSZYSCY
    if (channel.members.size === 0) {
      await channel.delete().catch(() => {});
      cleanup(channelId);
      clearInterval(interval);
      console.log(`[PRIVATE VC] 🧹 Usunięto pusty kanał: ${channelId}`);
    }
  }, CONFIG.WATCH_INTERVAL);
}

function cleanup(channelId) {
  const ownerId = channelOwners.get(channelId);
  if (ownerId) userChannels.delete(ownerId);
  channelOwners.delete(channelId);
  channelBans.delete(channelId);
}

module.exports = {
  init,
  handlePrivateChannelCreation,
  handlePrivatePanel,
  handlePrivateSelect,
  handleRename,
  handleLimit
};
