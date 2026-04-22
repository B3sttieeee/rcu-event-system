const { EmbedBuilder, Events, PermissionFlagsBits } = require("discord.js");

// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleLumberjackSelect } = require("../commands/lumberjack");

// Daily System
const {
  isDailyReady,
  claimDaily,
  onDailyClaimed
} = require("../utils/dailySystem");

// Embed Builder
const embedCommand = require("../commands/embed");

// Private Channel System
const {
  handlePrivatePanel,
  handlePrivateUserAction,
  handlePrivateRename,
  handlePrivateLimit
} = require("../utils/privateChannelSystem");   // zakładam, że masz te funkcje wyeksportowane

// ====================== MAIN ======================
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const cid = interaction.customId;
    const type = interaction.isChatInputCommand() ? "SLASH" :
                 interaction.isButton() ? `BUTTON:${cid || "NONE"}` :
                 interaction.isStringSelectMenu() ? `SELECT:${cid || "NONE"}` :
                 interaction.isModalSubmit() ? `MODAL:${cid || "NONE"}` : "UNKNOWN";

    try {
      console.log(`[INTERACTION] ${type} | ${interaction.user.tag} | ${cid ?? "NONE"}`);

      // 1. EMBED BUILDER
      if (interaction.isModalSubmit() && interaction.customId.startsWith("embedModal_")) {
        return await embedCommand.handleModal(interaction);
      }
      if (interaction.isButton() && interaction.customId.startsWith("embed_")) {
        return await embedCommand.handleButton(interaction);
      }

      // 2. GIVEAWAY
      if (interaction.isButton() && cid?.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }

      // 3. EVENT SYSTEM
      const eventIds = ["refresh", "roles", "dm", "role_menu", "dm_menu"];
      if ((interaction.isButton() || interaction.isStringSelectMenu()) && eventIds.includes(cid)) {
        return await handleEventInteraction(interaction);
      }

      // 4. LUMBERJACK
      if (interaction.isStringSelectMenu() &&
          (cid === "lumberjack_location" || cid === "lumberjack_duration")) {
        return await handleLumberjackSelect(interaction);
      }

      // 5. DAILY QUEST – POPRAWIONA WERSJA
      if (interaction.isButton() && cid === "daily_claim") {
        return await handleDailyClaim(interaction);
      }

      // 6. PRIVATE CHANNEL PANEL
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("private_panel_")) {
        return await handlePrivatePanel(interaction);
      }

      // 7. PRIVATE CHANNEL – USER SELECT (kick/ban/unban)
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("private_") && interaction.customId.includes("_user_")) {
        return await handlePrivateUserAction(interaction);
      }

      // 8. PRIVATE CHANNEL – MODALS (rename & limit)
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("private_rename_")) {
          return await handlePrivateRename(interaction);
        }
        if (interaction.customId.startsWith("private_limit_")) {
          return await handlePrivateLimit(interaction);
        }
      }

      // 9. TICKET SYSTEM
      const ticketIds = [
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn"
      ];
      if (
        (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) &&
        (ticketIds.includes(cid) || cid === "clan_ticket_select" || cid?.startsWith("ticket_modal_"))
      ) {
        return await ticketSystem.handle(interaction, client);
      }

      // 10. SLASH COMMANDS
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
          return interaction.reply({ content: "❌ Command not found.", ephemeral: true });
        }
        return await cmd.execute(interaction, client);
      }

      // Fallback
      if (cid) {
        console.log(`[UNHANDLED INTERACTION] ${type} | ${cid}`);
      }

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);

      const payload = {
        content: "❌ Wystąpił błąd systemu. Spróbuj ponownie później.",
        ephemeral: true
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      } catch (_) {}
    }
  }
};

// ====================== DAILY CLAIM HANDLER (NAPRAWIONY) ======================
async function handleDailyClaim(interaction) {
  const userId = interaction.user.id;

  if (interaction.replied || interaction.deferred) return;

  await interaction.deferUpdate().catch(() => {});

  try {
    if (!isDailyReady(userId)) {
      return await interaction.editReply({
        content: "❌ Twój Daily Quest nie jest jeszcze gotowy.",
        embeds: [],
        components: []
      });
    }

    const result = claimDaily(userId);

    if (!result?.success) {
      return await interaction.editReply({
        content: result?.message || "❌ Nie udało się odebrać daily.",
        embeds: [],
        components: []
      });
    }

    // Reset powiadomienia DM
    onDailyClaimed(userId);

    const successEmbed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("✅ Daily Quest odebrany!")
      .setDescription(result.message || "Gratulacje! Otrzymałeś dzisiejszą nagrodę.")
      .addFields(
        { name: "Nagroda", value: result.reward || `${result.xp || 0} XP`, inline: true },
        { name: "Streak", value: `\`${result.streak || "?"} dni 🔥\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });

    console.log(`[DAILY] Nagroda odebrana przez ${interaction.user.tag} (streak: ${result.streak})`);

  } catch (err) {
    console.error(`[DAILY] Błąd claim dla ${userId}:`, err);

    await interaction.editReply({
      content: "❌ Wystąpił nieoczekiwany błąd podczas odbierania daily.",
      embeds: [],
      components: []
    }).catch(() => {});
  }
}
