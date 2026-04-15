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

// ====================== MAIN ======================
module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const start = Date.now();
    const cid = interaction.customId || null;

    const type = getType(interaction);

    try {
      console.log(`[INTERACTION] ${type} | ${interaction.user.tag} | ${cid ?? "NO_ID"}`);

      // =====================================================
      // 1. GIVEAWAY BUTTONS
      // =====================================================
      if (interaction.isButton() && cid?.startsWith("gw_")) {
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
      // 3. EXPEDITION MENU
      // =====================================================
      if (interaction.isStringSelectMenu() && cid === "expedition_time_select") {
        return await handleExpeditionSelect(interaction);
      }

      // =====================================================
      // 4. DAILY SYSTEM
      // =====================================================
      if (interaction.isButton() && cid === "daily_claim") {
        return await handleDaily(interaction);
      }

      // =====================================================
      // 5. TICKETS (FULL SAFE HANDOFF)
      // =====================================================
      const ticketIds = new Set([
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn"
      ]);

      if (
        (interaction.isButton() || interaction.isModalSubmit()) &&
        ticketIds.has(cid)
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
      // UNKNOWN
      // =====================================================
      console.log(`[UNHANDLED INTERACTION] ${type} | ${cid}`);

    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);

      const payload = {
        content: "❌ Wystąpił błąd systemu.",
        ephemeral: true
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (_) {}
    } finally {
      const ms = Date.now() - start;
      if (ms > 2500) {
        console.warn(`[SLOW INTERACTION] ${ms}ms | ${type}`);
      }
    }
  }
};

// ====================== DAILY ======================
async function handleDaily(interaction) {
  try {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const member = interaction.member;

    if (!isDailyReady(userId)) {
      return interaction.editReply({
        content: "❌ Daily nie jest jeszcze gotowy.",
        embeds: [],
        components: []
      });
    }

    const result = await claimDaily(userId, member);

    if (!result?.success) {
      return interaction.editReply({
        content: "❌ Nie możesz jeszcze odebrać daily.",
        embeds: [],
        components: []
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#22c55e")
      .setTitle("🎁 Daily Odebrany")
      .setDescription(`+${result.xp} XP\n🔥 streak: ${result.streak || 0}`);

    return interaction.editReply({
      embeds: [embed],
      components: []
    });

  } catch (err) {
    console.error("DAILY ERROR:", err);
  }
}

// ====================== TYPE DEBUG ======================
function getType(i) {
  if (i.isChatInputCommand()) return "SLASH";
  if (i.isButton()) return `BUTTON:${i.customId}`;
  if (i.isModalSubmit()) return `MODAL:${i.customId}`;
  if (i.isStringSelectMenu()) return `SELECT:${i.customId}`;
  return "UNKNOWN";
}
