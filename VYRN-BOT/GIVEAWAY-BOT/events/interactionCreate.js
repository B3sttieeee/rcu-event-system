const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 📦 EMBED SYSTEM (TWÓJ MODAL)
      // =========================
      if (
        interaction.customId?.startsWith("embedModal_") ||
        interaction.customId?.startsWith("sendEmbed_") ||
        interaction.customId?.startsWith("editEmbed_")
      ) {
        // 👉 MASZ modalSubmit jako event
        return; // 🔥 NIE rób nic tutaj (już obsługiwane gdzie indziej)
      }

      // =========================
      // 🎁 GIVEAWAY (PRIORITY)
      // =========================
      if (interaction.isButton() && interaction.customId?.startsWith("gw_")) {
        return giveawaySystem.handleGiveaway(interaction);
      }

      // =========================
      // 🎫 TICKETS
      // =========================
      if (
        (interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu())
        &&
        !interaction.customId?.startsWith("gw_") &&
        !interaction.customId?.startsWith("embed")
      ) {
        if (ticketSystem?.handle) {
          return await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // 🎮 EVENT SYSTEM
      // =========================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu())
        &&
        !interaction.customId?.startsWith("gw_")
      ) {
        if (handleEventInteraction) {
          return await handleEventInteraction(interaction);
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
