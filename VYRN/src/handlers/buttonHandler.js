// src/handlers/buttonHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const giveawaySystem = require("../systems/giveaway");
const eventSystem = require("../systems/event");

module.exports = async function buttonHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[BUTTON] ${interaction.user.tag} → ${customId}`);

  try {
    // Private VC
    if (customId.startsWith("vc_")) {
      return await privateVC.handlePrivatePanel(interaction);
    }

    // Tickets
    if (customId === "close_ticket") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // Giveaway
    if (customId.startsWith("gw_")) {
      return await giveawaySystem.handleGiveaway(interaction);
    }

    // Event System
    if (["refresh", "roles", "dm"].includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // Nieobsłużony przycisk
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
        content: "❌ Wystąpił błąd przy obsłudze przycisku.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
