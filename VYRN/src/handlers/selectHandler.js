// src/handlers/selectHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const eventSystem = require("../systems/event");

module.exports = async function selectHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[SELECT] ${interaction.user.tag} → ${customId}`);

  try {
    // Private VC
    if (customId.startsWith("vc_kickselect_") || customId.startsWith("vc_banselect_")) {
      return await privateVC.handlePrivateSelect(interaction);
    }

    // Tickets
    if (customId === "clan_ticket_select") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // Event System
    if (["role_menu", "dm_menu"].includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // Lumberjack (jeśli masz)
    if (customId.startsWith("lumberjack_")) {
      const lumberjack = require("../commands/lumberjack");
      if (lumberjack.handleLumberjackSelect) {
        return await lumberjack.handleLumberjackSelect(interaction);
      }
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ta lista nie jest jeszcze obsługiwana.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("[SELECT HANDLER ERROR]", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Wystąpił błąd przy obsłudze listy.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
