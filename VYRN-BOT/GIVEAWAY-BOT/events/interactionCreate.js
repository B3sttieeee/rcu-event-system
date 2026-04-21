const { EmbedBuilder, Events, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");

// Daily System
const { 
  isDailyReady, 
  claimDaily,           // zakładam, że to funkcja z profileSystem
  onDailyClaimed        // ← z pliku daily (tego który wcześniej zrobiłem)
} = require("../utils/profileSystem");   // dostosuj ścieżkę jeśli inna

// ====================== MAIN ======================
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const cid = interaction.customId;

    const type = interaction.isChatInputCommand()
      ? "SLASH"
      : interaction.isButton()
      ? `BUTTON:${cid || "NONE"}`
      : interaction.isStringSelectMenu()
      ? `SELECT:${cid || "NONE"}`
      : interaction.isModalSubmit()
      ? `MODAL:${cid || "NONE"}`
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
      if ((interaction.isButton() || interaction.isStringSelectMenu()) && eventIds.includes(cid)) {
        return await handleEventInteraction(interaction);
      }

      // =====================================================
      // 3. EXPEDITION
      // =====================================================
      if (interaction.isStringSelectMenu() && cid === "expedition_time_select") {
        return await handleExpeditionSelect(interaction);
      }

      // =====================================================
      // 4. DAILY QUEST - Poprawiona sekcja
      // =====================================================
      if (interaction.isButton() && cid === "daily_claim") {
        return await handleDailyClaim(interaction);
      }

      // =====================================================
      // 5. TICKETS
      // =====================================================
      const ticketIds = [
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn"
      ];

      if ((interaction.isButton() || interaction.isModalSubmit()) && ticketIds.includes(cid)) {
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

// ====================== DAILY HANDLER ======================
async function handleDailyClaim(interaction) {
  const userId = interaction.user.id;

  // Zabezpieczenie przed spamem klikania
  if (interaction.replied || interaction.deferred) return;

  await interaction.deferUpdate().catch(() => {});

  try {
    // Sprawdzenie czy daily jest gotowy
    if (!isDailyReady(userId)) {
      return await interaction.editReply({
        content: "❌ Daily Quest nie jest jeszcze gotowy.",
        components: []
      }).catch(() => {});
    }

    // Claim nagrody
    const result = claimDaily(userId);   // zakładam, że zwraca { success: bool, message?: string, reward?: string }

    if (!result || !result.success) {
      return await interaction.editReply({
        content: result?.message || "❌ Nie udało się odebrać daily.",
        components: []
      }).catch(() => {});
    }

    // Sukces - resetujemy status powiadomienia DM
    onDailyClaimed(userId);

    // Opcjonalnie: ładny embed z nagrodą
    const successEmbed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("Daily Quest odebrany!")
      .setDescription(result.message || "Gratulacje! Otrzymałeś dzisiejszą nagrodę.")
      .addFields(
        { name: "Nagroda", value: result.reward || "Brak szczegółów", inline: true }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [successEmbed],
      components: []   // usuwamy przycisk
    });

    console.log(`[DAILY] Nagroda odebrana przez ${interaction.user.tag}`);

  } catch (err) {
    console.error(`[DAILY] Błąd podczas claimu dla ${userId}:`, err);

    await interaction.editReply({
      content: "❌ Wystąpił nieoczekiwany błąd podczas odbierania daily.",
      components: []
    }).catch(() => {});
  }
}
