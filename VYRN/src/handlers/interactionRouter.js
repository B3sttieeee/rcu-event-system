// =====================================================
// INTERACTION ROUTER - HYBRID MODULAR BOT
// =====================================================
const buttonHandler = require("./buttonHandler");
const selectHandler = require("./selectHandler");
const modalHandler = require("./modalHandler");

/**
 * Główny router wszystkich interakcji (zastępuje stary interactionCreate)
 * @param {import("discord.js").Interaction} interaction
 */
module.exports = async function interactionRouter(interaction) {
  // Ignorujemy interakcje spoza serwera
  if (!interaction.guild) return;

  try {
    // ==================== SLASH COMMANDS ====================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        return interaction.reply({
          content: "❌ Ta komenda nie istnieje lub jest nieaktywna.",
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
    // np. UserSelectMenu, RoleSelectMenu, ChannelSelectMenu itd.
    if (interaction.isAnySelectMenu() || interaction.isAutocomplete()) {
      console.log(`[INTERACTION] Nieobsłużony typ: ${interaction.type} | ${interaction.customId || "brak customId"}`);
    }

  } catch (error) {
    console.error("[INTERACTION ROUTER ERROR]", error);

    // Bezpieczne powiadomienie użytkownika
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ Wystąpił nieoczekiwany błąd podczas przetwarzania interakcji.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[INTERACTION] Nie udało się wysłać błędu:", e.message);
      }
    }
  }
};
