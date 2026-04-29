// src/handlers/buttonHandler.js
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
  const { customId, user, guild } = interaction;
  if (!customId) return;

  // Professional logging in HQ format
  console.log(`[INTERACTION] 🔘 ${user.tag} clicked: ${customId}`);

  try {
    // ==================== 1. PREFIX BASED INTERACTIONS ====================
    
    // Private Voice Channels (vc_lock, vc_rename, vc_limit etc.)
    if (customId.startsWith("vc_")) {
      return await privateVC.handlePrivatePanel(interaction);
    }

    // Giveaway System (gw_join, gw_leave)
    if (customId.startsWith("gw_")) {
      if (typeof giveawaySystem.handleGiveaway === "function") {
        return await giveawaySystem.handleGiveaway(interaction);
      }
    }

    // Embed Builder Utility (edit/delete flows)
    if (customId.startsWith("embed_edit_") || customId.startsWith("embed_delete_")) {
      if (typeof embedCommand.handleButton === "function") {
        return await embedCommand.handleButton(interaction);
      }
    }

    // ==================== 2. STATIC ID SWITCH ====================
    switch (customId) {
      // EVENT SYSTEM
      case "refresh_events":
      case "get_event_roles":
      case "get_event_dm":
        return await eventSystem.handleEventInteraction(interaction);

      // TICKET SYSTEM
      case "close_ticket":
      case "claim_ticket":
      case "rename_ticket":
      case "delete_ticket":
        return await ticketSystem.handle(interaction, interaction.client);

      // VERIFICATION (Optional - if you use a button for /verify)
      case "verify_start":
        return await interaction.reply({ 
          content: "⚙️ Please use the **`/verify`** command to begin the Roblox linking process.", 
          ephemeral: true 
        });

      default:
        // ==================== UNHANDLED INTERACTION ====================
        if (!interaction.replied && !interaction.deferred) {
          console.warn(`[BUTTON] ⚠️ Unhandled button ID: ${customId}`);
          await interaction.reply({
            content: "❌ **System Error:** This interaction is no longer active or supported.",
            ephemeral: true
          });
        }
    }

  } catch (error) {
    console.error("🔥 [BUTTON HANDLER ERROR]:", error);

    // Secure error response
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ **Critical Error:** An issue occurred while processing this request. Please contact HQ Administration.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[BUTTON] Failed to send error fallback response.");
      }
    }
  }
};
