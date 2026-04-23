// src/handlers/selectHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const eventSystem = require("../systems/event");

/**
 * Główny handler wszystkich StringSelectMenu (rozwijanych list)
 */
module.exports = async function selectHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[SELECT] ${interaction.user.tag} → ${customId}`);

  try {
    // ==================== PRIVATE VC ====================
    if (customId.startsWith("vc_kickselect_") || customId.startsWith("vc_banselect_")) {
      return await privateVC.handlePrivateSelect(interaction);
    }

    // ==================== TICKET SYSTEM ====================
    if (customId === "clan_ticket_select") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== EVENT SYSTEM ====================
    if (["role_menu", "dm_menu"].includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // ==================== LUMBERJACK ====================
    if (customId.startsWith("lumberjack_")) {
      const lumberjack = require("../commands/lumberjack");
      if (typeof lumberjack.handleLumberjackSelect === "function") {
        return await lumberjack.handleLumberjackSelect(interaction);
      }
    }

    // ==================== NIEOBSŁUŻONA LISTA ====================
    console.warn(`[SELECT] Nieobsłużona lista rozwijana: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ta lista rozwijana nie jest jeszcze obsługiwana.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("[SELECT HANDLER ERROR]", error);

    // Bezpieczna odpowiedź nawet jeśli coś pójdzie nie tak
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił błąd podczas przetwarzania listy rozwijanej.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[SELECT] Nie udało się wysłać odpowiedzi o błędzie.");
      }
    }
  }
};
