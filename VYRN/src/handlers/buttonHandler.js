// src/handlers/buttonHandler.js
const { MessageFlags } = require("discord.js");
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");
const embedCommand = require("../commands/embed");

/**
 * VYRN • Button Router (Prestige Edition)
 * Central management for all button interactions
 */
module.exports = async function buttonHandler(interaction) {
  const { customId, user } = interaction;
  if (!customId) return;

  console.log(`[INTERACTION] 🔘 ${user.tag} clicked: ${customId}`);

  try {
    // ==================== 1. PREFIX BASED INTERACTIONS ====================
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
    switch (customId) {
      case "refresh_events":
      case "get_event_roles":
      case "get_event_dm":
        return await eventSystem.handleEventInteraction(interaction);

      // --- TICKET SYSTEM ---
      case "close_ticket":
      case "claim_ticket":
      case "rename_ticket":
      case "delete_ticket":
      case "lock_ticket":   // Kluczowe dla systemu GOLD
      case "unlock_ticket": // Kluczowe dla systemu GOLD
        return await ticketSystem.handle(interaction, interaction.client);

      case "verify_start":
        return await interaction.reply({ 
          content: "⚙️ Please use the **`/verify`** command to begin the Roblox linking process.", 
          flags: [MessageFlags.Ephemeral]
        });

      default:
        // ==================== UNHANDLED INTERACTION ====================
        if (!interaction.replied && !interaction.deferred) {
          console.warn(`[BUTTON] ⚠️ Unhandled button ID: ${customId}`);
          await interaction.reply({
            content: "❌ **System Error:** This interaction is no longer active or supported.",
            flags: [MessageFlags.Ephemeral]
          });
        }
    }

  } catch (error) {
    console.error("🔥 [BUTTON HANDLER ERROR]:", error);

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
