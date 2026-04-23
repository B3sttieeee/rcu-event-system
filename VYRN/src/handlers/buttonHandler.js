// src/handlers/buttonHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");

/**
 * Główny handler wszystkich przycisków (buttons)
 */
module.exports = async function buttonHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[BUTTON] ${interaction.user.tag} → ${customId}`);

  try {
    // ==================== PRIVATE VC ====================
    if (customId.startsWith("vc_")) {
      return await privateVC.handlePrivatePanel(interaction);
    }

    // ==================== TICKETS ====================
    if (customId === "close_ticket") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== GIVEAWAY ====================
    if (customId.startsWith("gw_")) {
      if (typeof giveawaySystem.handleGiveaway === "function") {
        return await giveawaySystem.handleGiveaway(interaction);
      }
    }

    // ==================== EVENT SYSTEM ====================
    if (["refresh", "roles", "dm"].includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // ==================== EMBED COMMAND ====================
    if (customId.startsWith("embed_edit_") || customId.startsWith("embed_delete_")) {
      const embedCommand = require("../commands/embed");
      if (typeof embedCommand.handleButton === "function") {
        return await embedCommand.handleButton(interaction);
      }
    }

    // ==================== LUMBERJACK ====================
    if (customId.startsWith("lumberjack_")) {
      const lumberjack = require("../commands/lumberjack");
      if (typeof lumberjack.handleLumberjackSelect === "function") {
        return await lumberjack.handleLumberjackSelect(interaction);   // <-- tu jest select, nie button
      }
    }

    // ==================== NIEOBSŁUŻONY PRZYCISK ====================
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ten przycisk nie jest jeszcze obsługiwany.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("[BUTTON HANDLER ERROR]", error);

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił błąd podczas przetwarzania przycisku.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[BUTTON] Nie udało się wysłać odpowiedzi o błędzie.");
      }
    }
  }
};
