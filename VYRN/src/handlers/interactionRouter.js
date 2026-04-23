// src/handlers/interactionRouter.js
const buttonHandler = require("./buttonHandler");
const selectHandler = require("./selectHandler");
const modalHandler = require("./modalHandler");

/**
 * Główny Router Interakcji - HYBRID MODULAR BOT
 * Kieruje wszystkie interakcje do odpowiednich handlerów
 */
module.exports = async function interactionRouter(interaction) {
  // Ignorujemy interakcje spoza serwera (np. DM)
  if (!interaction.guild) return;

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
      return await command.execute(interaction, interaction.client);
    }

    // ==================== BUTTONS ====================
    if (interaction.isButton()) {
      return await buttonHandler(interaction);
    }

    // ==================== SELECT MENUS ====================
    if (interaction.isStringSelectMenu()) {
      return await selectHandler(interaction);
    }

    // ==================== MODALS ====================
    if (interaction.isModalSubmit()) {
      return await modalHandler(interaction);
    }

    // ==================== INNE INTERAKCJE (opcjonalnie) ====================
    // Możesz tu dodać obsługę UserSelectMenu, RoleSelectMenu itp. w przyszłości

    console.log(`[INTERACTION] Nieobsłużony typ: ${interaction.type} | CustomID: ${interaction.customId || "brak"}`);

  } catch (error) {
    console.error("[INTERACTION ROUTER ERROR]", error);

    // Bezpieczne powiadomienie użytkownika (unikamy crasha)
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił nieoczekiwany błąd podczas przetwarzania interakcji.",
          ephemeral: true
        });
      } catch (e) {
        // Jeśli nie da się odpowiedzieć (np. interakcja wygasła)
        console.error("[INTERACTION] Nie udało się wysłać odpowiedzi o błędzie.");
      }
    }
  }
};
