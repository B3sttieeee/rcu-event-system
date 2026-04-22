// =====================================================
// BUTTON HANDLER - HYBRID MODULAR BOT
// =====================================================
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");

/**
 * Główny handler wszystkich przycisków (buttonów)
 * @param {import("discord.js").ButtonInteraction} interaction
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
    if (customId === "close_ticket" || customId === "clan_ticket_select") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== GIVEAWAY ====================
    if (customId.startsWith("gw_")) {
      return await giveawaySystem.handleGiveaway(interaction);
    }

    // ==================== EVENT SYSTEM ====================
    const eventButtons = ["refresh", "roles", "dm"];
    if (eventButtons.includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // ==================== INNE / NIEZNANE ====================
    console.warn(`[BUTTON] Nieobsłużony przycisk: ${customId}`);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ten przycisk nie jest jeszcze obsługiwany.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("[BUTTON HANDLER ERROR]", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas obsługi przycisku.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
