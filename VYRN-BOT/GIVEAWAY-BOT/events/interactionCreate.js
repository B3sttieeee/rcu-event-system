// events/interactionCreate.js
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleExpeditionSelect } = require("../commands/expedition"); // obsługa select menu ekspedycji
const ticketSystem = require("../utils/ticketSystem");
const { handleGiveaway } = require("../utils/giveaway");
const { isDailyReady, claimDaily } = require("../utils/daily");

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
      if ((interaction.isButton() || interaction.isStringSelectMenu()) &&
          ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)) {
        return handleEventInteraction(interaction);
      }

      // =========================
      // 🗺️ EXPEDITION PANEL (SELECT MENU)
      // =========================
      if (interaction.isStringSelectMenu() && interaction.customId === "expedition_time_select") {
        return handleExpeditionSelect(interaction);
      }

      // =========================
      // 🎯 DAILY CLAIM
      // =========================
      if (interaction.isButton() && interaction.customId === "daily_claim") {
        const userId = interaction.user.id;

        if (!isDailyReady(userId)) {
          return interaction.reply({ content: "❌ Daily not ready yet!", ephemeral: true });
        }

        const reward = await claimDaily(userId, interaction.member);

        if (!reward || reward.error) {
          return interaction.reply({ content: "❌ Cannot claim daily yet!", ephemeral: true });
        }

        return interaction.reply({
          content:
`🎁 **Daily Claimed!**

✨ XP gained: **${reward.xp}**
🔥 Streak: **${reward.streak}**

💪 Come back tomorrow for more!`,
          ephemeral: true
        });
      }

      // =========================
      // 🎫 TICKETS
      // =========================
      if (interaction.isButton() || interaction.isModalSubmit()) {
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
          await interaction.followUp({ content: "❌ Error occurred", ephemeral: true });
        } else {
          await interaction.reply({ content: "❌ Error occurred", ephemeral: true });
        }
      } catch {}
    }
  }
};
