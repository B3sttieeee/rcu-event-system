const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 📦 EMBED SYSTEM (NAJPIERW!)
      // =========================
      if (
        interaction.customId?.startsWith("embedModal_") ||
        interaction.customId?.startsWith("sendEmbed_") ||
        interaction.customId?.startsWith("editEmbed_")
      ) {
        // 👉 załaduj embed system
        const embedSystem = require("../events/embedSystem");
        return embedSystem.execute(interaction, client);
      }

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
      // 🎁 GIVEAWAY
      // =========================
      if (interaction.isButton()) {
        if (interaction.customId?.startsWith("gw_")) {
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

      const command = client.commands.get(interaction.commandName);

      if (!command) {
        return interaction.reply({
          content: "❌ Komenda nie istnieje",
          ephemeral: true
        });
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
