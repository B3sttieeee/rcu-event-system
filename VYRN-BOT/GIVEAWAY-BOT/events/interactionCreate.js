const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 📦 EMBED SYSTEM (IGNORE)
      // =========================
      if (
        interaction.customId?.startsWith("embedModal_") ||
        interaction.customId?.startsWith("sendEmbed_") ||
        interaction.customId?.startsWith("editEmbed_")
      ) {
        return;
      }

      // =========================
      // 🎁 GIVEAWAY (PRIORITY)
      // =========================
      if (interaction.isButton() && interaction.customId?.startsWith("gw_")) {
        return giveawaySystem.handleGiveaway(interaction);
      }

      // =========================
      // 🍯 EVENT SYSTEM (POPRAWKA)
      // =========================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        return handleEventInteraction(interaction);
      }

      // =========================
      // 🎫 TICKETS (bez konfliktów)
      // =========================
      if (
        (interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()) &&
        !interaction.customId?.startsWith("gw_") &&
        !["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        if (ticketSystem?.handle) {
          return await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // ⚡ SLASH COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      const command = client.commands.get(interaction.commandName);

      if (!command) {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({
            content: "❌ Komenda nie istnieje",
            ephemeral: true
          });
        } else {
          return interaction.reply({
            content: "❌ Komenda nie istnieje",
            ephemeral: true
          });
        }
      }

      await command.execute(interaction, client);

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
