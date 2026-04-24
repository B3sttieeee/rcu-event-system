const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const eventSystem = require("../systems/event");

const { SHOP_BOOSTS, buyBoost } = require("../systems/boost");

/**
 * Główny handler wszystkich StringSelectMenu
 * VYRN • Black Interaction System
 */
module.exports = async function selectHandler(interaction) {
  const customId = interaction.customId;
  if (!customId) return;

  console.log(`[SELECT] ${interaction.user.tag} → ${customId}`);

  try {
    // ==================== PRIVATE VC ====================
    if (
      customId.startsWith("vc_kickselect_") ||
      customId.startsWith("vc_banselect_")
    ) {
      return await privateVC.handlePrivateSelect(interaction);
    }

    // ==================== TICKET SYSTEM ====================
    if (customId === "clan_ticket_select") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== EVENT SYSTEM ====================
    if (["role_menu", "dm_menu"].includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // ==================== SHOP SYSTEM ====================
    if (customId === "shop_select_boost") {
      const boostId = interaction.values[0];

      const boost = SHOP_BOOSTS.find(b => b.id === boostId);

      if (!boost) {
        return interaction.reply({
          content: "❌ This boost does not exist.",
          ephemeral: true
        });
      }

      const result = buyBoost(interaction.user.id, boostId);

      if (!result.success) {
        return interaction.reply({
          content: `❌ ${result.message}`,
          ephemeral: true
        });
      }

      return interaction.reply({
        content: `⚡ You successfully purchased **${boost.name}**!`,
        ephemeral: true
      });
    }

    // ==================== UNKNOWN SELECT ====================
    console.warn(`[SELECT] Unhandled select menu: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ This menu is not handled yet.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("[SELECT HANDLER ERROR]", error);

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "❌ An error occurred while processing this menu.",
          ephemeral: true
        });
      } catch (e) {
        console.error("[SELECT] Failed to send error reply.");
      }
    }
  }
};
