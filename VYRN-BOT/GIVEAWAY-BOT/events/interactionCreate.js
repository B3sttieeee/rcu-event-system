const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");

const {
  loadProfile,
  saveProfile,
  isDailyReady,
  claimDaily
} = require("../utils/profileSystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 🎁 GIVEAWAY
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
      // 🎯 DAILY CLAIM (FIX 🔥)
      // =========================
      if (interaction.isButton() && interaction.customId === "daily_claim") {

        const userId = interaction.user.id;

        // ❌ nie gotowe
        if (!isDailyReady(userId)) {
          return interaction.reply({
            content: "❌ Daily not ready yet!",
            flags: 64
          });
        }

        // ✅ CLAIM
        const reward = claimDaily(userId); // MUSISZ mieć to w profileSystem

        return interaction.reply({
          content:
`🎁 **Daily Claimed!**

🔥 Streak: ${reward.streak}
✨ XP: +${reward.xp}

Wracaj jutro 💪`,
          flags: 64
        });
      }

      // =========================
      // 🎫 TICKETS
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

        if (!command) return;

        return await command.execute(interaction, client);
      }

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "❌ Error",
            flags: 64
          });
        } else {
          await interaction.reply({
            content: "❌ Error",
            flags: 64
          });
        }
      } catch {}
    }
  }
};
