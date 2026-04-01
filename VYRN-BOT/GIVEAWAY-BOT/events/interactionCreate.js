const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // ===== SLASH COMMAND =====
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        return await command.execute(interaction, client);
      }

      // ===== GIVEAWAY =====
      if (interaction.isButton() && interaction.customId.startsWith("gw_")) {
        return giveawaySystem.handleGiveaway(interaction);
      }

      // ===== EVENT SYSTEM =====
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        return handleEventInteraction(interaction);
      }

      // ===== TICKETS =====
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
            content: "❌ Wystąpił błąd",
            flags: 64
          });
        } else {
          await interaction.reply({
            content: "❌ Wystąpił błąd",
            flags: 64
          });
        }
      } catch {}
    }
  }
};
