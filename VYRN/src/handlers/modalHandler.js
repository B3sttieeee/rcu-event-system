// src/handlers/buttonHandler.js
const { MessageFlags } = require("discord.js");
const ticketSystem = require("../systems/tickets");
const privateVC = require("../systems/privatevc");

/**
 * ========================================================
 * VYRN HQ • BUTTON ROUTER (PRESTIGE EDITION)
 * Central processing for all Button interactions
 * ========================================================
 */
module.exports = async function buttonHandler(interaction) {
  const { customId, user } = interaction;
  if (!customId) return;

  // HQ Professional Logging
  console.log(`[INTERACTION] 🔘 ${user.tag} clicked button: ${customId}`);

  try {
    // ==================== 1. TICKET SYSTEM CONTROLS ====================
    // List of IDs used in your tickets/index.js staff panel
    const ticketButtons = [
      "claim_ticket", 
      "close_ticket", 
      "rename_ticket", 
      "lock_ticket", 
      "unlock_ticket"
    ];

    if (ticketButtons.includes(customId)) {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== 2. PRIVATE VC SYSTEM ====================
    // Handles voice channel controls (lock, unlock, ghost, etc.)
    if (customId.startsWith("vc_")) {
      return await privateVC.handleButton(interaction);
    }

    // ==================== 3. UNHANDLED BUTTON ====================
    // If the button ID is not recognized by any system
    console.warn(`[BUTTON] ⚠️ Unregistered button interaction: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: "❌ **System Alert:** This button trigger is not registered in the HQ database.",
        flags: [MessageFlags.Ephemeral]
      });
    }

  } catch (error) {
    console.error("🔥 [BUTTON ROUTER ERROR]:", error);

    // ==================== SAFE FALLBACK ====================
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ **Critical Error:** Failed to execute button action. Contact Administration.",
          flags: [MessageFlags.Ephemeral]
        });
      } catch (e) {
        console.error("[BUTTON] Failed to send emergency error response.");
      }
    }
  }
};
