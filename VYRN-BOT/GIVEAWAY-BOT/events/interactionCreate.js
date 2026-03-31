const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // ⚡ SLASH COMMANDS (PRIORYTET)
      // =========================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({
            content: "❌ Komenda nie istnieje",
            ephemeral: true
          });
        }

        return await command.execute(interaction, client);
      }

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
      // 🎁 GIVEAWAY
      // =========================
      if (interaction.isButton() && interaction.customId?.startsWith("gw_")) {
        return giveawaySystem.handleGiveaway(interaction);
      }

      // =========================
      // 🍯 EVENT SYSTEM
      // =========================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        return handleEventInteraction(interaction);
      }

      // =========================
      // 🎫 TICKETS
      // =========================
      if (
        interaction.isButton() &&
        ["open_ticket", "close_ticket"].includes(interaction.customId)
      ) {
        return ticketSystem.handle(interaction, client);
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId === "ticket_modal"
      ) {
        return ticketSystem.handle(interaction, client);
      }

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: "❌ Wystąpił błąd"
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
