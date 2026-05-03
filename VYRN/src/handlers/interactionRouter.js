// src/handlers/interactionRouter.js
const { MessageFlags } = require("discord.js"); // POPRAWKA: Dodano import flag
const buttonHandler = require("./buttonHandler");
const selectHandler = require("./selectHandler");
const modalHandler = require("./modalHandler");

/**
 * VYRN HQ • CENTRAL INTERACTION ROUTER
 * The core engine handling Slash Commands, Buttons, Select Menus, and Modals.
 */
module.exports = async function interactionRouter(interaction) {
  // Global Guard: Only process interactions within the VYRN Server
  if (!interaction.guild) return;

  const { user, commandName, customId } = interaction;

  try {
    // ==================== 1. SLASH COMMANDS ====================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(commandName);

      if (!command) {
        console.warn(`[COMMAND] ⚠️ Unknown command executed: /${commandName}`);
        return interaction.reply({
          content: "❌ **System Error:** This command is unregistered or undergoing maintenance.",
          flags: [MessageFlags.Ephemeral] // POPRAWKA
        });
      }

      console.log(`[SLASH] ⚔️ ${user.tag} executed: /${commandName}`);
      return await command.execute(interaction);
    }

    // ==================== 2. AUTOCOMPLETE ====================
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(commandName);
      if (!command) return;

      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`[AUTOCOMPLETE ERROR] /${commandName}:`, err);
      }
      return;
    }

    // ==================== 3. BUTTONS ====================
    if (interaction.isButton()) {
      // Handled by the dedicated button handler
      return await buttonHandler(interaction);
    }

    // ==================== 4. SELECT MENUS ====================
    // POPRAWKA: Usunięto isEntitySelectMenu(), które nie istnieje w Twojej wersji d.js
    // Sprawdzamy ogólnie isStringSelectMenu lub uniwersalne isSelectMenu
    if (interaction.isStringSelectMenu() || (typeof interaction.isSelectMenu === 'function' && interaction.isSelectMenu())) {
      // Process select menus
      return await selectHandler(interaction);
    }

    // ==================== 5. MODAL SUBMISSIONS ====================
    if (interaction.isModalSubmit()) {
      return await modalHandler(interaction);
    }

    // ==================== 6. CONTEXT MENU COMMANDS ====================
    if (interaction.isContextMenuCommand()) {
      const command = interaction.client.commands.get(commandName);
      if (command && typeof command.execute === "function") {
        console.log(`[CONTEXT] 📋 ${user.tag} triggered: ${commandName}`);
        return await command.execute(interaction);
      }
    }

    // Unhandled Interaction Types
    console.warn(`[ROUTER] ⚠️ Unhandled interaction type: ${interaction.type} | ID: ${customId || "N/A"}`);

  } catch (error) {
    console.error("🔥 [CORE ROUTER ERROR]:", error);

    // Secure fallback response for the end-user
    const errorPayload = {
      content: "❌ **HQ System Alert:** An internal error occurred while processing your request. Please report this to an Administrator.",
      flags: [MessageFlags.Ephemeral] // POPRAWKA
    };

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply(errorPayload);
      } catch (replyError) {
        console.error("[ROUTER] Failed to send emergency error response:", replyError.message);
      }
    } else {
      // If the bot already acknowledged but crashed later, use followUp
      await interaction.followUp(errorPayload).catch(() => {});
    }
  }
};
