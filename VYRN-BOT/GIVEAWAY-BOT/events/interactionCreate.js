const { EmbedBuilder } = require("discord.js");

const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");
const { isDailyReady, claimDaily } = require("../utils/profileSystem");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      // ====================== GIVEAWAY ======================
      if (interaction.isButton() && interaction.customId?.startsWith("gw_")) {
        return handleGiveaway(interaction);
      }

      // ====================== EVENT SYSTEM ======================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(interaction.customId)
      ) {
        return handleEventInteraction(interaction);
      }

      // ====================== EXPEDITION SELECT ======================
      if (interaction.isStringSelectMenu() && interaction.customId === "expedition_time_select") {
        return handleExpeditionSelect(interaction);
      }

      // ====================== DAILY CLAIM ======================
      if (interaction.isButton() && interaction.customId === "daily_claim") {
        return await handleDailyClaim(interaction);
      }

      // ====================== TICKET SYSTEM ======================
      if (interaction.isButton() || interaction.isModalSubmit()) {
        return ticketSystem.handle(interaction, client);
      }

      // ====================== SLASH COMMANDS ======================
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

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);

      const errorMsg = { 
        content: "❌ Wystąpił nieoczekiwany błąd podczas przetwarzania interakcji.", 
        ephemeral: true 
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg);
        } else {
          await interaction.reply(errorMsg);
        }
      } catch (e) {
        // Ignorujemy błąd przy wysyłaniu wiadomości o błędzie
      }
    }
  }
};

// ====================== DAILY CLAIM HANDLER ======================
async function handleDailyClaim(interaction) {
  // deferUpdate jest najlepsze przy przyciskach (nie pokazuje "thinking")
  await interaction.deferUpdate();

  const userId = interaction.user.id;
  const member = interaction.member;

  // Sprawdzenie czy daily jest gotowy
  if (!isDailyReady(userId)) {
    return interaction.editReply({
      content: "❌ Twój daily nie jest jeszcze gotowy! Spróbuj ponownie jutro.",
      components: [],
      embeds: []
    });
  }

  // Odebranie daily
  const result = await claimDaily(userId, member);

  if (!result.success) {
    const msg = result.error === "cooldown" 
      ? "❌ Daily możesz odebrać tylko raz na 24 godziny!" 
      : "❌ Nie udało się odebrać daily. Spróbuj ponownie później.";

    return interaction.editReply({
      content: msg,
      components: [],
      embeds: []
    });
  }

  // Sukces - pokazujemy ładny embed
  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("🎁 Daily Odebrany!")
    .setDescription(
      `**Zdobyłeś:** \`${result.xp} XP\`\n` +
      `**Obecny streak:** 🔥 \`${result.streak}\` dni\n\n` +
      `Wróć jutro po kolejny daily!`
    )
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: []
  });
}
