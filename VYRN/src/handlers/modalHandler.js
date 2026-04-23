// src/handlers/modalHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");

/**
 * Główny handler wszystkich ModalSubmit (formularzy)
 * Spójny styl z pozostałymi handlerami
 */
module.exports = async function modalHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[MODAL] ${interaction.user.tag} → ${customId}`);

  try {
    // ==================== PRIVATE VC ====================
    if (customId.startsWith("vc_rename_")) {
      return await privateVC.handleRename(interaction);
    }

    if (customId.startsWith("vc_limit_")) {
      return await privateVC.handleLimit(interaction);
    }

    // ==================== TICKET SYSTEM ====================
    if (customId.startsWith("ticket_modal_")) {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== EMBED COMMAND ====================
    if (customId.startsWith("embedModal_")) {
      const embedCommand = require("../commands/embed");
      if (typeof embedCommand.handleModal === "function") {
        return await embedCommand.handleModal(interaction);
      }
    }

    // ==================== NIEOBSŁUŻONY MODAL ====================
    console.warn(`[MODAL] Nieobsłużony modal: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ten formularz nie jest jeszcze obsługiwany.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("[MODAL HANDLER ERROR]", error);

    // Bezpieczna odpowiedź dla użytkownika
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił błąd podczas przetwarzania formularza.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[MODAL] Nie udało się wysłać odpowiedzi o błędzie.");
      }
    }
  }
};
