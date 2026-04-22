// src/handlers/modalHandler.js
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");

module.exports = async function modalHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[MODAL] ${interaction.user.tag} → ${customId}`);

  try {
    // Private VC
    if (customId.startsWith("vc_rename_")) {
      return await privateVC.handleRename(interaction);
    }
    if (customId.startsWith("vc_limit_")) {
      return await privateVC.handleLimit(interaction);
    }

    // Tickets
    if (customId.startsWith("ticket_modal_")) {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // Embed command (jeśli używasz)
    if (customId.startsWith("embedModal_")) {
      const embedCmd = require("../commands/embed");
      if (embedCmd.handleModal) return await embedCmd.handleModal(interaction);
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ten formularz nie jest jeszcze obsługiwany.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("[MODAL HANDLER ERROR]", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Wystąpił błąd przy obsłudze formularza.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
