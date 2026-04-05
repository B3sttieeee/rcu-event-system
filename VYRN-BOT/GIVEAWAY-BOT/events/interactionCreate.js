const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");

const {
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
      // 🗺️ EXPEDITION SELECT MENU
      // =========================
      if (interaction.isStringSelectMenu() && interaction.customId === "expedition_time_select") {
        return handleExpeditionSelect(interaction);
      }

      // =========================
      // 🎯 DAILY CLAIM BUTTON
      // =========================
      if (interaction.isButton() && interaction.customId === "daily_claim") {
        return await handleDailyClaim(interaction);
      }

      // =========================
      // 🎫 TICKET SYSTEM
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
        const errorMsg = { content: "❌ Wystąpił błąd podczas przetwarzania interakcji.", flags: 64 };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMsg);
        } else {
          await interaction.reply(errorMsg);
        }
      } catch (e) {}
    }
  }
};

// ====================== DAILY CLAIM HANDLER ======================
async function handleDailyClaim(interaction) {
  await interaction.deferUpdate(); // ważne przy przycisku

  const userId = interaction.user.id;
  const member = interaction.member;

  // Sprawdź czy daily jest gotowy
  if (!isDailyReady(userId)) {
    return interaction.editReply({
      content: "❌ Twój daily nie jest jeszcze gotowy!",
      components: [],
      embeds: []
    });
  }

  // Claim daily
  const result = await claimDaily(userId, member);

  if (!result.success) {
    let msg = "❌ Nie udało się odebrać daily.";

    if (result.error === "cooldown") {
      msg = "❌ Daily możesz odebrać tylko raz na 24 godziny!";
    }

    return interaction.editReply({
      content: msg,
      components: [],
      embeds: []
    });
  }

  // Sukces
  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("🎁 Daily Odebrany!")
    .setDescription(
`**Zdobyłeś:** \`${result.xp} XP\`\n` +
`**Nowy streak:** 🔥 \`${result.streak}\`\n\n` +
`Wracaj jutro po kolejny daily!`
    )
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: []
  });
}
