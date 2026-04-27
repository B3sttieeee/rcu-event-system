// src/handlers/buttonHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");
const embedCommand = require("../commands/embed"); // Przeniesione na górę (optymalizacja)

/**
 * VYRN • Button Router (Black Edition)
 * Obsługa wszystkich kliknięć w przyciski
 */
module.exports = async function buttonHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[BUTTON] 🔘 ${interaction.user.tag} → ${customId}`);

  try {
    // ==================== 1. DYNAMICZNE ID (Prefixy) ====================
    
    // Prywatne kanały (vc_lock, vc_rename itp.)
    if (customId.startsWith("vc_")) {
      return await privateVC.handlePrivatePanel(interaction);
    }

    // Giveaway (gw_join, gw_leave)
    if (customId.startsWith("gw_")) {
      if (typeof giveawaySystem.handleGiveaway === "function") {
        return await giveawaySystem.handleGiveaway(interaction);
      }
    }

    // Embed Builder (edycja/usuwanie)
    if (customId.startsWith("embed_edit_") || customId.startsWith("embed_delete_")) {
      if (typeof embedCommand.handleButton === "function") {
        return await embedCommand.handleButton(interaction);
      }
    }

    // ==================== 2. STATYCZNE ID (Szybki Switch) ====================
    switch (customId) {
      // EVENT SYSTEM (Nowe ID z wersji v2)
      case "refresh_events":
      case "get_event_roles":
      case "get_event_dm":
        return await eventSystem.handleEventInteraction(interaction);

      // TICKETS
      case "close_ticket":
      case "claim_ticket": // Obsługa przycisku Claim
      case "rename_ticket": // Obsługa przycisku Rename w tickecie
        return await ticketSystem.handle(interaction, interaction.client);

      default:
        // ==================== NIEOBSŁUŻONY PRZYCISK ====================
        if (!interaction.replied && !interaction.deferred) {
          console.warn(`[BUTTON] ⚠️ Nieobsłużony przycisk: ${customId}`);
          await interaction.reply({
            content: "❌ Ten przycisk nie jest jeszcze obsługiwany w systemie.",
            ephemeral: true
          });
        }
    }

  } catch (error) {
    console.error("🔥 [BUTTON HANDLER ERROR]:", error);

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił błąd podczas przetwarzania interakcji.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[BUTTON] Nie udało się wysłać odpowiedzi o błędzie.");
      }
    }
  }
};
