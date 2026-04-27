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
 * VYRN • Private VC System (Black Edition)
 * ========================================================
 */

// ====================== CONFIG ======================
const CREATE_CHANNEL_ID = "1496280414237491220";
const PRIVATE_CATEGORY_ID = "1496281285780574268";
const CREATE_COOLDOWN = 5000;
const MOVE_DELAY = 1500;
const WATCH_INTERVAL = 15000;

// ====================== CACHE ======================
const userChannels = new Map();   // ownerId → channelId
const channelOwners = new Map();  // channelId → ownerId
const creatingUsers = new Set();
const channelBans = new Map();    // channelId → Set<userId>

// ====================== INIT ======================
function init(client) {
  global.client = client;
  console.log("[SYSTEM] 🔒 Private VC System → załadowany");
}

// ====================== CREATE CHANNEL ======================
async function handlePrivateChannelCreation(member) {
  // Bezpieczne sprawdzanie stanu kanału
  if (!member.voice || member.voice.channelId !== CREATE_CHANNEL_ID) return;
  if (creatingUsers.has(member.id)) return;

  creatingUsers.add(member.id);
  setTimeout(() => creatingUsers.delete(member.id), CREATE_COOLDOWN);

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
      name: `🔒・${member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: PRIVATE_CATEGORY_ID,
      userLimit: 10,
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
      if (freshMember && freshMember.voice?.channelId === CREATE_CHANNEL_ID) {
        freshMember.voice.setChannel(channel).catch(() => {});
      }
    }, MOVE_DELAY);

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
    .setColor("#0a0a0a") // Styl VYRN Black Edition
    .setTitle("🔒 Zarządzanie Kanałem Prywatnym")
    .setDescription(`Witaj ${owner}! Jesteś właścicielem tego kanału.\nUżyj poniższych przycisków, aby nim zarządzać.`)
    .setFooter({ text: "VYRN • Private VC" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_rename_${channel.id}`).setLabel("Zmień Nazwę").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_limit_${channel.id}`).setLabel("Limit Osób").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_lock_${channel.id}`).setLabel("Zablokuj (Lock)").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unlock_${channel.id}`).setLabel("Odblokuj (Unlock)").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vc_kick_${channel.id}`).setLabel("Wyrzuć").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_ban_${channel.id}`).setLabel("Zbanuj").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_unban_${channel.id}`).setLabel("Odbanuj Wszystkich").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`vc_delete_${channel.id}`).setLabel("Usuń Kanał").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row1, row2] }).catch(() => {});
}

// ====================== BUTTON HANDLER ======================
async function handlePrivatePanel(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const channelId = parts[2];

  // Weryfikacja Właściciela
  const ownerId = channelOwners.get(channelId);
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ Tylko właściciel kanału może używać tych przycisków!", ephemeral: true });
  }

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "❌ Ten kanał już nie istnieje.", ephemeral: true });
  }

  try {
    switch (action) {
      case "rename":
        const renameModal = new ModalBuilder()
          .setCustomId(`vc_rename_${channelId}`)
          .setTitle("Zmień nazwę kanału")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("new_name")
                .setLabel("Nowa nazwa kanału:")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(30)
                .setRequired(true)
            )
          );
        return await interaction.showModal(renameModal);

      case "limit":
        const limitModal = new ModalBuilder()
          .setCustomId(`vc_limit_${channelId}`)
          .setTitle("Zmień limit osób")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("new_limit")
                .setLabel("Limit (0-99, 0 = brak limitu):")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(2)
                .setRequired(true)
            )
          );
        return await interaction.showModal(limitModal);

      case "lock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
        return await interaction.reply({ content: "🔒 Kanał został zablokowany. Nikt nowy nie dołączy.", ephemeral: true });

      case "unlock":
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
        return await interaction.reply({ content: "🔓 Kanał został odblokowany.", ephemeral: true });

      case "kick":
        const kickSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`vc_kickselect_${channelId}`)
            .setPlaceholder("Wybierz użytkownika do wyrzucenia")
        );
        return await interaction.reply({ content: "Wybierz kogo chcesz wyrzucić z kanału:", components: [kickSelect], ephemeral: true });

      case "ban":
        const banSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`vc_banselect_${channelId}`)
            .setPlaceholder("Wybierz użytkownika do zbanowania na tym VC")
        );
        return await interaction.reply({ content: "Wybierz kogo chcesz permanentnie wyrzucić z tego kanału:", components: [banSelect], ephemeral: true });

      case "unban":
        channelBans.set(channelId, new Set());
        // Resetowanie uprawnień (usuwa nadpisania dla użytkowników zablokowanych)
        channel.permissionOverwrites.cache.forEach(async (overwrite) => {
          if (overwrite.id !== interaction.guild.id && overwrite.id !== ownerId) {
            await overwrite.delete().catch(() => {});
          }
        });
        return await interaction.reply({ content: "✅ Odbanowano wszystkich użytkowników. Mogą oni ponownie dołączyć.", ephemeral: true });

      case "delete":
        await interaction.reply({ content: "🗑️ Kanał jest usuwany...", ephemeral: true });
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

  await channel.setName(newName).catch(() => {});
  return interaction.reply({ content: `✅ Zmieniono nazwę kanału na: **${newName}**`, ephemeral: true });
}

async function handleLimit(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  let newLimit = parseInt(interaction.fields.getTextInputValue("new_limit"));

  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
  if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
    return interaction.reply({ content: "❌ Podaj prawidłową liczbę od 0 do 99.", ephemeral: true });
  }

  await channel.setUserLimit(newLimit).catch(() => {});
  return interaction.reply({ content: `✅ Zmieniono limit osób na: **${newLimit === 0 ? "Brak limitu" : newLimit}**`, ephemeral: true });
}

// ====================== SELECT HANDLERS (Kick / Ban) ======================
async function handlePrivateSelect(interaction) {
  const action = interaction.customId.split("_")[1]; // kickselect lub banselect
  const channelId = interaction.customId.split("_")[2];
  const targetId = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });

  if (targetId === interaction.user.id) {
    return interaction.reply({ content: "❌ Nie możesz wykonać tej akcji na sobie!", ephemeral: true });
  }

  const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);

  if (action === "kickselect") {
    if (targetMember && targetMember.voice.channelId === channelId) {
      await targetMember.voice.disconnect("Wyrzucony z prywatnego kanału").catch(() => {});
      return interaction.update({ content: `✅ Wyrzucono **${targetMember.user.tag}** z kanału.`, components: [] });
    }
    return interaction.update({ content: `❌ Ten użytkownik nie znajduje się na Twoim kanale.`, components: [] });
  }

  if (action === "banselect") {
    let bans = channelBans.get(channelId) || new Set();
    bans.add(targetId);
    channelBans.set(channelId, bans);

    // Blokujemy użytkownikowi możliwość wejścia
    await channel.permissionOverwrites.edit(targetId, { Connect: false });

    // Jeśli siedzi na kanale, wywalamy go
    if (targetMember && targetMember.voice.channelId === channelId) {
      await targetMember.voice.disconnect("Zbanowany na prywatnym kanale").catch(() => {});
    }

    return interaction.update({ content: `⛔ **${targetMember?.user.tag || "Użytkownik"}** został permanentnie zbanowany na Twoim kanale.`, components: [] });
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
    // Jeśli kanał jest pusty, usuń go
    if (channel.members.size === 0) {
      await channel.delete().catch(() => {});
      cleanup(channelId);
      clearInterval(interval);
      console.log(`[PRIVATE VC] 🧹 Usunięto pusty kanał (${channelId})`);
    }
  }, WATCH_INTERVAL);
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
