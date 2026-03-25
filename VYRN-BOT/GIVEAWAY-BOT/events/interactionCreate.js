const fs = require("fs");

// SYSTEMY
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 🎫 TICKET SYSTEM
      // =========================
      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        if (ticketSystem && typeof ticketSystem.handle === "function") {
          await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // 🎉 EVENT SYSTEM (BUTTONS + MENUS)
      // =========================
      if (
        interaction.isButton() ||
        interaction.isStringSelectMenu()
      ) {
        if (handleEventInteraction) {
          await handleEventInteraction(interaction);
        }
      }

      // =========================
      // 🎁 GIVEAWAY BUTTONS
      // =========================
      if (interaction.isButton()) {
        if (giveawaySystem && typeof giveawaySystem.handleInteraction === "function") {
          await giveawaySystem.handleInteraction(interaction);
        }
      }

      // =========================
      // ⚡ SLASH COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      const commandFiles = fs.readdirSync("./commands");
      const commands = new Map();

      for (const file of commandFiles) {
        try {
          const command = require(`../commands/${file}`);
          if (command?.data?.name) {
            commands.set(command.data.name, command);
          }
        } catch (err) {
          console.log("❌ COMMAND LOAD ERROR:", file, err);
        }
      }

      const cmd = commands.get(interaction.commandName);
      if (!cmd) return;

      await cmd.execute(interaction, client);

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "❌ Wystąpił błąd",
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: "❌ Wystąpił błąd",
            ephemeral: true
          });
        }
      } catch {}
    }
  }
};
