const {
  EmbedBuilder,
  Events
} = require("discord.js");
// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../../utils/giveawaysystem");
const { handleExpeditionSelect } = require("../commands/expedition");
const { isDailyReady, claimDaily } = require("../utils/profileSystem");

// ====================== MAIN ======================
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const cid = interaction.customId;
    const type =
      interaction.isChatInputCommand()
        ? "SLASH"
        : interaction.isButton()
        ? `BUTTON:${cid}`
        : interaction.isStringSelectMenu()
        ? `SELECT:${cid}`
        : interaction.isModalSubmit()
        ? `MODAL:${cid}`
        : "UNKNOWN";
    try {
      console.log(`[INTERACTION] ${type} | ${interaction.user.tag} | ${cid ?? "NONE"}`);
      // =====================================================
      // 1. GIVEAWAY
      // =====================================================
      if (interaction.isButton() && cid?.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }
      // =====================================================
      // 2. EVENT SYSTEM
      // =====================================================
      const eventIds = ["refresh", "roles", "dm", "role_menu", "dm_menu"];
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        eventIds.includes(cid)
      ) {
        return await handleEventInteraction(interaction);
      }
      // =====================================================
      // 3. EXPEDITION
      // =====================================================
      if (
        interaction.isStringSelectMenu() &&
        cid === "expedition_time_select"
      ) {
        return await handleExpeditionSelect(interaction);
      }
      // =====================================================
      // 4. DAILY
      // =====================================================
      if (interaction.isButton() && cid === "daily_claim") {
        await interaction.deferUpdate().catch(() => {});
        return handleDaily(interaction);
      }
      // =====================================================
      // 5. TICKETS
      // =====================================================
      const ticketIds = [
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn",
        "clan_ticket_select"
      ];
      if (
        (interaction.isButton() || interaction.isModalSubmit()) &&
        ticketIds.includes(cid)
      ) {
        return await ticketSystem.handle(interaction, client);
      }
      // 🔥 EXTRA FIX FOR SELECT MENU (IMPORTANT)
      if (
        interaction.isStringSelectMenu() &&
        cid === "clan_ticket_select"
      ) {
        return await ticketSystem.handle(interaction, client);
      }
      // =====================================================
      // 6. SLASH COMMANDS
      // =====================================================
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
          return interaction.reply({
            content: "❌ Command not found.",
            ephemeral: true
          });
        }
        return await cmd.execute(interaction, client);
      }
      // =====================================================
      // FALLBACK
      // =====================================================
      console.log(`[UNHANDLED] ${type} | ${cid}`);
    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);
      const payload = {
        content: "❌ System error occurred.",
        ephemeral: true
      };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (_) {}
    }
  }
};
