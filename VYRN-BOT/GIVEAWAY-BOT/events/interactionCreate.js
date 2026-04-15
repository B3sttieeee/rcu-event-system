const { EmbedBuilder, Events } = require("discord.js");

// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");
const { isDailyReady, claimDaily } = require("../utils/profileSystem");

// ====================== CONFIG ======================
const CONFIG = {
  LOG_CHANNEL_ID: "1494072832827850953"
};

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const start = Date.now();

    const type = getType(interaction);
    const cid = interaction.customId || "N/A";

    try {
      console.log(`[INTERACTION] ${type} | ${interaction.user.tag} | ${cid}`);

      // =====================================================
      // 1. GIVEAWAY
      // =====================================================
      if (interaction.isButton() && cid.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }

      // =====================================================
      // 2. EVENT SYSTEM
      // =====================================================
      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        ["refresh", "roles", "dm", "role_menu", "dm_menu"].includes(cid)
      ) {
        return await handleEventInteraction(interaction);
      }

      // =====================================================
      // 3. EXPEDITION
      // =====================================================
      if (interaction.isStringSelectMenu() && cid === "expedition_time_select") {
        return await handleExpeditionSelect(interaction);
      }

      // =====================================================
      // 4. DAILY
      // =====================================================
      if (interaction.isButton() && cid === "daily_claim") {
        return await handleDaily(interaction);
      }

      // =====================================================
      // 5. TICKETS (🔥 FIX: TWARDY RETURN FLOW)
      // =====================================================
      const ticketIds = [
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn"
      ];

      if (
        (interaction.isButton() || interaction.isModalSubmit()) &&
        ticketIds.includes(cid)
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
            content: "❌ Nie znaleziono komendy.",
            ephemeral: true
          });
        }

        return await cmd.execute(interaction, client);
      }

      // =====================================================
      // fallback
      // =====================================================
      console.log(`[UNHANDLED] ${type} | ${cid}`);

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);

      const msg = {
        content: "❌ Błąd systemu.",
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    } finally {
      const ms = Date.now() - start;
      if (ms > 2500) {
        console.warn(`[SLOW INTERACTION] ${ms}ms | ${type}`);
      }
    }
  }
};

// ====================== DAILY HANDLER ======================
async function handleDaily(interaction) {
  await interaction.deferUpdate().catch(() => {});

  const userId = interaction.user.id;
  const member = interaction.member;

  if (!isDailyReady(userId)) {
    return interaction.editReply({
      content: "❌ Daily nie gotowy.",
      embeds: [],
      components: []
    });
  }

  const result = await claimDaily(userId, member);

  if (!result.success) {
    return interaction.editReply({
      content: "❌ Nie możesz jeszcze odebrać daily.",
      embeds: [],
      components: []
    });
  }

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🎁 Daily Odebrany")
    .setDescription(
      `+${result.xp} XP\n🔥 streak: ${result.streak}`
    );

  return interaction.editReply({
    embeds: [embed],
    components: []
  });
}

// ====================== TYPE ======================
function getType(i) {
  if (i.isChatInputCommand()) return "SLASH";
  if (i.isButton()) return `BUTTON:${i.customId}`;
  if (i.isModalSubmit()) return `MODAL:${i.customId}`;
  if (i.isStringSelectMenu()) return `SELECT:${i.customId}`;
  return "UNKNOWN";
}
