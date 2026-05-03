// src/handlers/modalHandler.js
const { MessageFlags } = require("discord.js");
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const embedCommand = require("../commands/embed");

/**
 * ========================================================
 * VYRN HQ • MODAL ROUTER (PRESTIGE EDITION)
 * Central processing for all Modal Submissions
 * ========================================================
 */
module.exports = async function modalHandler(interaction) {
  const { customId, user } = interaction;
  if (!customId) return;

  // HQ Professional Logging
  console.log(`[INTERACTION] 📝 ${user.tag} submitted modal: ${customId}`);

  try {
    // ==================== 1. PRIVATE VC SYSTEM ====================
    // Handles renaming and user limit adjustments for Voice Channels
    if (customId.startsWith("vc_rename_")) {
      return await privateVC.handleRename(interaction);
    }
    
    if (customId.startsWith("vc_limit_")) {
      return await privateVC.handleLimit(interaction);
    }

    // ==================== 2. TICKET SYSTEM (VYRN GOLD) ====================
    // Handles:
    // - Initial ticket creation (ticket_modal_vyrn, ticket_modal_staff, etc.)
    // - Staff renaming (ticket_rename_modal_CHANNELID)
    if (customId.startsWith("ticket_modal_") || customId.startsWith("ticket_rename_modal_")) {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== 3. ADVANCED EMBED BUILDER ====================
    // Handles the core logic for the Prestige Embed Command
    if (customId.startsWith("embedModal_")) {
      return await embedCommand.handleModal(interaction);
    }

    // ==================== 4. UNHANDLED MODAL ====================
    console.warn(`[MODAL] ⚠️ Unregistered modal submission: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: "❌ **System Alert:** This form layout is not currently registered in the HQ database.",
        flags: [MessageFlags.Ephemeral]
      });
    }

  } catch (error) {
    console.error("🔥 [MODAL ROUTER ERROR]:", error);

    // ==================== SAFE FALLBACK ====================
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ **Critical Error:** Failed to transmit form data to HQ servers. Contact Administration.",
          flags: [MessageFlags.Ephemeral]
        });
      } catch (e) {
        console.error("[MODAL] Failed to send emergency error response.");
      }
    }
  }
};
