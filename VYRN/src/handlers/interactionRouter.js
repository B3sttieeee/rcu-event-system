// src/handlers/interactionRouter.js
const buttonHandler = require("./buttonHandler");
const selectHandler = require("./selectHandler");
const modalHandler = require("./modalHandler");

/**
 * Główny Router Interakcji - HYBRID MODULAR BOT
 * Centralny punkt obsługi wszystkich interakcji Discord (Slash, Buttons, Select Menus, Modals)
 */
module.exports = async function interactionRouter(interaction) {
  // Ignorujemy interakcje spoza serwera (DM, Group DM itp.)
  if (!interaction.guild) {
    return;
  }

  try {
    // ==================== SLASH COMMANDS ====================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        return interaction.reply({
          content: "❌ Ta komenda nie istnieje lub jest aktualnie niedostępna.",
          ephemeral: true
        });
      }

      console.log(`[SLASH] ${interaction.user.tag} → /${interaction.commandName}`);
      return await command.execute(interaction);
    }

    // ==================== BUTTONS ====================
    if (interaction.isButton()) {
      console.log(`[BUTTON] ${interaction.user.tag} → ${interaction.customId}`);
      return await buttonHandler(interaction);
    }

    // ==================== SELECT MENUS ====================
    if (interaction.isStringSelectMenu()) {
      console.log(`[SELECT] ${interaction.user.tag} → ${interaction.customId}`);
      return await selectHandler(interaction);
    }

    // ==================== MODALS ====================
    if (interaction.isModalSubmit()) {
      console.log(`[MODAL] ${interaction.user.tag} → ${interaction.customId}`);
      return await modalHandler(interaction);
    }

    // ==================== INNE INTERAKCJE (Context Menu, User Select, etc.) ====================
    if (interaction.isContextMenuCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && typeof command.execute === "function") {
        console.log(`[CONTEXT] ${interaction.user.tag} → ${interaction.commandName}`);
        return await command.execute(interaction);
      }
    }

    // Logowanie nieobsłużonych typów interakcji (do debugowania)
    console.warn(`[INTERACTION] Nieobsłużony typ interakcji: ${interaction.type} | CustomID: ${interaction.customId || "brak"}`);

  } catch (error) {
    console.error("[INTERACTION ROUTER ERROR]", error);

    // Bezpieczna próba odpowiedzi użytkownikowi (zabezpieczenie przed "Interaction has already been acknowledged")
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił nieoczekiwany błąd podczas przetwarzania interakcji.",
          ephemeral: true
        });
      } catch (replyError) {
        console.error("[INTERACTION] Nie udało się wysłać odpowiedzi o błędzie:", replyError.message);
      }
    }
  }
};
