// src/handlers/buttonHandler.js
const { MessageFlags } = require("discord.js");
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");
const embedCommand = require("../commands/embed");

/**
 * VYRN HQ • BUTTON ROUTER (PRESTIGE EDITION)
 * Central management for all button interactions
 */
module.exports = async function buttonHandler(interaction) {
  const { customId, user } = interaction;
  if (!customId) return;

  // HQ Professional Logging
  console.log(`[INTERACTION] 🔘 ${user.tag} clicked: ${customId}`);

  try {
    // ==================== 1. PREFIX BASED INTERACTIONS ====================
    // Systemy oparte na dynamicznych ID (zaczynające się od...)
    if (customId.startsWith("vc_")) {
      return await privateVC.handlePrivatePanel(interaction);
    }

    if (customId.startsWith("gw_")) {
      if (typeof giveawaySystem.handleGiveaway === "function") {
        return await giveawaySystem.handleGiveaway(interaction);
      }
    }

    if (customId.startsWith("embed_edit_") || customId.startsWith("embed_delete_")) {
      if (typeof embedCommand.handleButton === "function") {
        return await embedCommand.handleButton(interaction);
      }
    }

    // ==================== 2. STATIC ID SWITCH ====================
    // Stałe ID przycisków zdefiniowane w Twoich systemach
    switch (customId) {
      // --- WYDARZENIA (EVENT SYSTEM) ---
      case "refresh_events":
      case "get_event_roles":
      case "get_event_dm":
        return await eventSystem.handleEventInteraction(interaction);

      // --- SYSTEM TICKETÓW (VYRN GOLD) ---
      // Tutaj muszą być wszystkie ID z Twojego pliku tickets/index.js
      case "close_ticket":
      case "claim_ticket":
      case "rename_ticket":
      case "delete_ticket":
      case "lock_ticket":   // Kluczowe dla blokowania pisania
      case "unlock_ticket": // Kluczowe dla odblokowania pisania
        return await ticketSystem.handle(interaction, interaction.client);

      // --- WERYFIKACJA ---
      case "verify_start":
        return await interaction.reply({ 
          content: "⚙️ Please use the **`/verify`** command to begin the Roblox linking process.", 
          flags: [MessageFlags.Ephemeral]
        });

      default:
        // ==================== UNHANDLED INTERACTION ====================
        // Jeśli bot tu dotarł, oznacza to, że przycisk ma ID, którego nie ma powyżej
        console.warn(`[BUTTON] ⚠️ Unhandled button ID: ${customId}`);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ **System Alert:** Button ID \`${customId}\` is not registered in the HQ database.`,
            flags: [MessageFlags.Ephemeral]
          });
        }
    }

  } catch (error) {
    console.error("🔥 [BUTTON HANDLER ERROR]:", error);

    // ==================== EMERGENCY FALLBACK ====================
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ **Critical Error:** An issue occurred while processing this request. Please contact HQ Administration.",
          flags: [MessageFlags.Ephemeral]
        });
      } catch (e) {
        console.error("[BUTTON] Failed to send error fallback response.");
      }
    }
  }
};
