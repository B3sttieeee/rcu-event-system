// src/handlers/interactionRouter.js
const buttonHandler = require("./buttonHandler");
const selectHandler = require("./selectHandler");
const modalHandler = require("./modalHandler");

module.exports = async function interactionRouter(interaction) {
  try {
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({ content: "❌ Komenda nie istnieje.", ephemeral: true });
      }
      return await command.execute(interaction, interaction.client);
    }

    // Buttons
    if (interaction.isButton()) {
      return await buttonHandler(interaction);
    }

    // Select Menus
    if (interaction.isStringSelectMenu()) {
      return await selectHandler(interaction);
    }

    // Modals
    if (interaction.isModalSubmit()) {
      return await modalHandler(interaction);
    }

  } catch (error) {
    console.error("[INTERACTION ROUTER ERROR]", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Wystąpił nieoczekiwany błąd.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
