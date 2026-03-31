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
      // 🍯 EVENT SYSTEM
      // =========================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        return handleEventInteraction(interaction);
      }

      // =========================
      // 🎫 TICKETS (NAPRAWIONE)
      // =========================
      if (
        (interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()) &&
        interaction.customId?.startsWith("ticket_")
      ) {
        if (ticketSystem?.handle) {
          return await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // ⚡ SLASH COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      // 🔥 NAJWAŻNIEJSZE — defer OD RAZU
      await interaction.deferReply({ ephemeral: true });

      const command = client.commands.get(interaction.commandName);

      if (!command) {
        return interaction.editReply({
          content: "❌ Komenda nie istnieje"
        });
      }

      await command.execute(interaction, client);

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: "❌ Wystąpił błąd"
          });
        } else {
          await interaction.reply({
            content: "❌ Wystąpił błąd"
          });
        }
      } catch {}
    }
  }
};
