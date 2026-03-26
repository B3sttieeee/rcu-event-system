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
      // 🎫 TICKETS
      // =========================
      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        if (ticketSystem?.handle) {
          await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // 🎁 GIVEAWAY (NAPRAWIONE)
      // =========================
      if (interaction.isButton()) {
        if (interaction.customId.startsWith("gw_")) {
          return giveawaySystem.handleGiveaway(interaction);
        }
      }

      // =========================
      // 🎮 EVENT SYSTEM
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
      // ⚡ SLASH COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      const commandFiles = fs.readdirSync("./commands");
      const commands = new Map();

      for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        if (command?.data?.name) {
          commands.set(command.data.name, command);
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
            content: "❌ Error",
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: "❌ Error",
            ephemeral: true
          });
        }
      } catch {}
    }
  }
};
