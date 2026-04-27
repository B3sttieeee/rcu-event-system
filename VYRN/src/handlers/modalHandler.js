// src/handlers/modalHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const embedCommand = require("../commands/embed"); // Ładowane raz przy starcie (optymalizacja)

/**
 * ========================================================
 * VYRN • Modal Handler (Black Edition)
 * Clean, safe & optimized form interaction router
 * ========================================================
 */
module.exports = async function modalHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[MODAL] 📝 ${interaction.user.tag} wysłał formularz: ${customId}`);

  try {
    // ==================== PRIVATE VC ====================
    if (customId.startsWith("vc_rename_")) return await privateVC.handleRename(interaction);
    if (customId.startsWith("vc_limit_")) return await privateVC.handleLimit(interaction);

    // ==================== TICKET SYSTEM ====================
    if (customId.startsWith("ticket_modal_")) return await ticketSystem.handle(interaction, interaction.client);

    // ==================== EMBED COMMAND ====================
    if (customId.startsWith("embedModal_")) return await embedCommand.handleModal(interaction);

    // ==================== NIEOBSŁUŻONY MODAL ====================
    console.warn(`[MODAL] ⚠️ Nieobsłużony formularz: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: "❌ Ten formularz nie jest jeszcze podłączony do systemu.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("🔥 [MODAL HANDLER ERROR]:", error);

    // ==================== BEZPIECZNY FALLBACK BŁĘDÓW ====================
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił błąd serwera podczas przetwarzania formularza.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[MODAL] ❌ Nie udało się wysłać wiadomości o błędzie (Discord API).");
      }
    }
  }
};
