const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 🎁 GIVEAWAY (NAJPIERW)
      // =========================
      if (interaction.isButton() && interaction.customId?.startsWith("gw_")) {
        return handleGiveaway(interaction);
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
      // 🎯 DAILY BUTTON (NOWE 🔥)
      // =========================
      if (interaction.isButton() && interaction.customId === "daily_claim") {
        return interaction.reply({
          content: "🎯 Użyj komendy **/daily** aby odebrać nagrodę!",
          flags: 64
        });
      }

      // =========================
      // 🎫 TICKETS (PEŁNA OBSŁUGA)
      // =========================
      if (
        interaction.isButton() ||
        interaction.isModalSubmit()
      ) {
        return ticketSystem.handle(interaction, client);
      }

      // =========================
      // ⚡ SLASH COMMANDS
      // =========================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          console.log(`❌ Nie znaleziono komendy: ${interaction.commandName}`);
          return;
        }

        return await command.execute(interaction, client);
      }

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);

      try {
        if (interaction.replied || interaction.deferred) {
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
