// =====================================================
// SELECT HANDLER - HYBRID MODULAR BOT
// =====================================================
const privateVC = require("../systems/privatevc");
const ticketSystem = require("../systems/tickets");
const eventSystem = require("../systems/event");

/**
 * Główny handler wszystkich StringSelectMenu (rozwijanych list)
 * @param {import("discord.js").StringSelectMenuInteraction} interaction
 */
module.exports = async function selectHandler(interaction) {
  const customId = interaction.customId;

  if (!customId) return;

  console.log(`[SELECT] ${interaction.user.tag} → ${customId}`);

  try {
    // ==================== PRIVATE VC ====================
    if (customId.startsWith("vc_kickselect_") || customId.startsWith("vc_banselect_")) {
      return await privateVC.handlePrivateSelect(interaction);
    }

    // ==================== TICKET SYSTEM ====================
    if (customId === "clan_ticket_select") {
      return await ticketSystem.handle(interaction, interaction.client);
    }

    // ==================== EVENT SYSTEM ====================
    const eventSelects = ["role_menu", "dm_menu"];
    if (eventSelects.includes(customId)) {
      return await eventSystem.handleEventInteraction(interaction);
    }

    // ==================== LUMBERJACK (jeśli masz) ====================
    if (customId === "lumberjack_location" || customId === "lumberjack_duration") {
      const { handleLumberjackSelect } = require("../commands/lumberjack");
      if (typeof handleLumberjackSelect === "function") {
        return await handleLumberjackSelect(interaction);
      }
    }

    // ==================== INNE / NIEZNANE ====================
    console.warn(`[SELECT] Nieobsłużona lista rozwijana: ${customId}`);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Ta lista rozwijana nie jest jeszcze obsługiwana.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error("[SELECT HANDLER ERROR]", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas obsługi listy rozwijanej.",
        ephemeral: true
      }).catch(() => {});
    }
  }
};
