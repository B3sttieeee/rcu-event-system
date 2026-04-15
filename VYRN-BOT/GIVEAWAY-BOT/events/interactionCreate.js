const { EmbedBuilder, Events } = require("discord.js");

// ====================== IMPORTY SYSTEMÓW ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");
const { isDailyReady, claimDaily } = require("../utils/profileSystem");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const startTime = Date.now();
    const interactionType = getInteractionType(interaction);

    try {
      console.log(
        `[INTERACTION] ${interactionType} | User: ${interaction.user.tag} (${interaction.user.id}) | CustomID: ${interaction.customId || "N/A"}`
      );

      // ====================== 1. GIVEAWAY ======================
      if (interaction.isButton() && interaction.customId?.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }

      // ====================== 2. EVENT ======================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        return await handleEventInteraction(interaction);
      }

      // ====================== 3. EXPEDITION ======================
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "expedition_time_select"
      ) {
        return await handleExpeditionSelect(interaction);
      }

      // ====================== 4. DAILY ======================
      if (interaction.isButton() && interaction.customId === "daily_claim") {
        return await handleDailyClaim(interaction);
      }

      // ====================== 5. TICKETY (FIXED 🔥) ======================
      if (interaction.isButton() || interaction.isModalSubmit()) {
        const id = interaction.customId || "";

        if (
          id.startsWith("ticket_") ||
          id.startsWith("open_ticket_") ||
          id.startsWith("ticket_modal_") ||
          id === "close_ticket"
        ) {
          return await ticketSystem.handle(interaction, client);
        }
      }

      // ====================== 6. SLASH COMMANDS ======================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({
            content: "❌ Nie znaleziono takiej komendy.",
            ephemeral: true
          });
        }

        return await command.execute(interaction, client);
      }

      // ====================== NIEOBSŁUŻONE ======================
      if (!interaction.replied && !interaction.deferred) {
        console.warn(
          `[INTERACTION] Nieobsłużona interakcja: ${interactionType} | CustomID: ${interaction.customId || "N/A"}`
        );
      }

    } catch (err) {
      console.error(`❌ INTERACTION ERROR [${interactionType}]`, err);

      const errorResponse = {
        content:
          "❌ Wystąpił nieoczekiwany błąd podczas przetwarzania interakcji.\nSpróbuj ponownie lub zgłoś administratorowi.",
        ephemeral: true
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorResponse);
        } else {
          await interaction.reply(errorResponse);
        }
      } catch (followUpError) {
        console.error("❌ Nie udało się wysłać wiadomości o błędzie:", followUpError);
      }
    } finally {
      const executionTime = Date.now() - startTime;

      if (executionTime > 3000) {
        console.warn(
          `[INTERACTION] Wolna interakcja (${executionTime}ms) | Type: ${interactionType}`
        );
      }
    }
  }
};

// ====================== HELPER ======================
function getInteractionType(interaction) {
  if (interaction.isChatInputCommand()) return "SLASH_COMMAND";
  if (interaction.isButton()) return `BUTTON (${interaction.customId || "N/A"})`;
  if (interaction.isModalSubmit()) return `MODAL (${interaction.customId || "N/A"})`;
  if (interaction.isStringSelectMenu()) return `SELECT_MENU (${interaction.customId || "N/A"})`;
  if (interaction.isUserSelectMenu()) return "USER_SELECT_MENU";
  if (interaction.isRoleSelectMenu()) return "ROLE_SELECT_MENU";
  if (interaction.isChannelSelectMenu()) return "CHANNEL_SELECT_MENU";
  return "UNKNOWN_INTERACTION";
}

// ====================== DAILY CLAIM ======================
async function handleDailyClaim(interaction) {
  try {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const member = interaction.member;

    if (!isDailyReady(userId)) {
      return await interaction.editReply({
        content: "❌ Twój daily nie jest jeszcze gotowy!",
        components: [],
        embeds: []
      });
    }

    const result = await claimDaily(userId, member);

    if (!result.success) {
      return await interaction.editReply({
        content:
          result.error === "cooldown"
            ? "❌ Daily możesz odebrać tylko raz na 24h!"
            : "❌ Błąd podczas odbierania daily.",
        components: [],
        embeds: []
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎁 Daily Odebrany!")
      .setDescription(
        `**XP:** \`${result.xp}\`\n` +
        `🔥 **Streak:** \`${result.streak}\`\n\n` +
        `Wróć jutro po więcej!`
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: []
    });

  } catch (err) {
    console.error("❌ Daily error:", err);
  }
}
