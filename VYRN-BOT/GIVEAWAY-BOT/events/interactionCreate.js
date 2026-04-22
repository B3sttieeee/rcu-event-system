const {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");

// Daily System
const {
  isDailyReady,
  claimDaily,
  onDailyClaimed
} = require("../utils/dailySystem");

// Embed Builder
const embedCommand = require("../commands/embed");

// ====================== MAIN ======================
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const cid = interaction.customId;
    const type = interaction.isChatInputCommand() ? "SLASH" :
                 interaction.isButton() ? `BUTTON:${cid || "NONE"}` :
                 interaction.isStringSelectMenu() ? `SELECT:${cid || "NONE"}` :
                 interaction.isModalSubmit() ? `MODAL:${cid || "NONE"}` : "UNKNOWN";

    try {
      console.log(`[INTERACTION] ${type} | ${interaction.user.tag} | ${cid ?? "NONE"}`);

      // 1. EMBED BUILDER
      if (interaction.isModalSubmit() && interaction.customId.startsWith("embedModal_")) {
        return await embedCommand.handleModal(interaction);
      }
      if (interaction.isButton() && interaction.customId.startsWith("embed_")) {
        return await embedCommand.handleButton(interaction);
      }

      // 2. GIVEAWAY
      if (interaction.isButton() && cid?.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }

      // 3. EVENT SYSTEM
      const eventIds = ["refresh", "roles", "dm", "role_menu", "dm_menu"];
      if ((interaction.isButton() || interaction.isStringSelectMenu()) && eventIds.includes(cid)) {
        return await handleEventInteraction(interaction);
      }

      // 4. EXPEDITION
      if (interaction.isStringSelectMenu() && cid === "expedition_time_select") {
        return await handleExpeditionSelect(interaction);
      }

      // 5. DAILY QUEST
      if (interaction.isButton() && cid === "daily_claim") {
        return await handleDailyClaim(interaction);
      }

      // 6. PRIVATE CHANNEL PANEL (Select Menu)
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("private_panel_")) {
        return await handlePrivatePanel(interaction);
      }

      // 7. PRIVATE CHANNEL MODALS (rename & limit)
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("private_rename_")) {
          return await handlePrivateRename(interaction);
        }
        if (interaction.customId.startsWith("private_limit_")) {
          return await handlePrivateLimit(interaction);
        }
      }

      // 8. TICKET SYSTEM
      const ticketIds = [
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn"
      ];
      if (
        (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) &&
        (ticketIds.includes(cid) || cid === "clan_ticket_select" || cid?.startsWith("ticket_modal_"))
      ) {
        return await ticketSystem.handle(interaction, client);
      }

      // 9. SLASH COMMANDS
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
          return interaction.reply({ content: "❌ Command not found.", ephemeral: true });
        }
        return await cmd.execute(interaction, client);
      }

      if (cid) {
        console.log(`[UNHANDLED INTERACTION] ${type} | ${cid}`);
      }

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);
      const payload = {
        content: "❌ Wystąpił błąd systemu. Spróbuj ponownie później.",
        ephemeral: true
      };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      } catch (_) {}
    }
  }
};

// ====================== DAILY CLAIM HANDLER ======================
async function handleDailyClaim(interaction) {
  const userId = interaction.user.id;
  if (interaction.replied || interaction.deferred) return;
  await interaction.deferUpdate().catch(() => {});

  try {
    if (!isDailyReady(userId)) {
      return await interaction.editReply({
        content: "❌ Twój Daily Quest nie jest jeszcze gotowy.",
        components: []
      });
    }

    const result = claimDaily(userId);
    if (!result?.success) {
      return await interaction.editReply({
        content: result?.message || "❌ Nie udało się odebrać daily.",
        components: []
      });
    }

    onDailyClaimed(userId);

    const successEmbed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("✅ Daily Quest odebrany!")
      .setDescription(result.message || "Gratulacje! Otrzymałeś dzisiejszą nagrodę.")
      .addFields(
        { name: "Nagroda", value: result.reward || `${result.xp || 0} XP`, inline: true },
        { name: "Streak", value: `\`${result.streak || "?"} dni\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });

    console.log(`[DAILY] Nagroda odebrana przez ${interaction.user.tag}`);
  } catch (err) {
    console.error(`[DAILY] Błąd claim dla ${userId}:`, err);
    await interaction.editReply({
      content: "❌ Wystąpił nieoczekiwany błąd podczas odbierania daily.",
      components: []
    }).catch(() => {});
  }
};

// ====================== PRIVATE CHANNEL SELECT MENU ======================
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

  // Modale
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

  // Pozostałe akcje
  await interaction.deferUpdate().catch(() => {});

  if (action === "delete") {
    await channel.delete().catch(() => {});
    userChannels.delete(interaction.user.id);
    await interaction.followUp({
      content: "🗑️ Kanał został pomyślnie usunięty.",
      ephemeral: true
    });
  } else {
    await interaction.followUp({
      content: `✅ Wybrano akcję: **${action}**\nPełna obsługa zostanie dodana wkrótce.`,
      ephemeral: true
    });
  }
};

// ====================== PRIVATE RENAME MODAL ======================
async function handlePrivateRename(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const newName = interaction.fields.getTextInputValue("new_name");

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
  }

  try {
    await channel.setName(newName);
    await interaction.reply({
      content: `✅ Nazwa kanału zmieniona na: **${newName}**`,
      ephemeral: true
    });
  } catch (err) {
    console.error("[PrivateRename] Błąd:", err);
    await interaction.reply({
      content: "❌ Nie udało się zmienić nazwy kanału (sprawdź długość lub uprawnienia).",
      ephemeral: true
    });
  }
};

// ====================== PRIVATE LIMIT MODAL ======================
async function handlePrivateLimit(interaction) {
  const channelId = interaction.customId.split("_")[2];
  const newLimit = parseInt(interaction.fields.getTextInputValue("new_limit"));

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "❌ Kanał nie istnieje.", ephemeral: true });
  }

  if (isNaN(newLimit) || newLimit < 1 || newLimit > 99) {
    return interaction.reply({ content: "❌ Limit musi być liczbą od 1 do 99.", ephemeral: true });
  }

  try {
    await channel.setUserLimit(newLimit);
    await interaction.reply({
      content: `✅ Limit osób na kanale zmieniony na: **${newLimit}**`,
      ephemeral: true
    });
  } catch (err) {
    console.error("[PrivateLimit] Błąd:", err);
    await interaction.reply({
      content: "❌ Nie udało się zmienić limitu kanału.",
      ephemeral: true
    });
  }
}
