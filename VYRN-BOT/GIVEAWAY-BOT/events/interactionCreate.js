const { EmbedBuilder, Events } = require("discord.js");

// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleLumberjackSelect } = require("../commands/lumberjack");

// Daily System
const {
  isDailyReady,
  claimDaily
} = require("../utils/profileSystem");

const {
  onDailyClaimed
} = require("../utils/dailySystem");

const embedCommand = require("../commands/embed");

const {
  handlePrivatePanel,
  handlePrivateUserAction,
  handlePrivateRename,
  handlePrivateLimit
} = require("../utils/privateChannelSystem");

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

      if (interaction.isModalSubmit() && interaction.customId.startsWith("embedModal_")) {
        return await embedCommand.handleModal(interaction);
      }
      if (interaction.isButton() && interaction.customId.startsWith("embed_")) {
        return await embedCommand.handleButton(interaction);
      }
      if (interaction.isButton() && cid?.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }
      const eventIds = ["refresh", "roles", "dm", "role_menu", "dm_menu"];
      if ((interaction.isButton() || interaction.isStringSelectMenu()) && eventIds.includes(cid)) {
        return await handleEventInteraction(interaction);
      }
      if (interaction.isStringSelectMenu() &&
          (cid === "lumberjack_location" || cid === "lumberjack_duration")) {
        return await handleLumberjackSelect(interaction);
      }
      if (interaction.isButton() && cid === "daily_claim") {
        return await handleDailyClaim(interaction);
      }
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("private_panel_")) {
        return await handlePrivatePanel(interaction);
      }
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("private_") && interaction.customId.includes("_user_")) {
        return await handlePrivateUserAction(interaction);
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("private_rename_")) {
          return await handlePrivateRename(interaction);
        }
        if (interaction.customId.startsWith("private_limit_")) {
          return await handlePrivateLimit(interaction);
        }
      }
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
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
          return interaction.reply({ content: "❌ Command not found.", ephemeral: true });
        }
        return await cmd.execute(interaction, client);
      }
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

// ====================== DAILY CLAIM HANDLER (Z LOGAMI) ======================
async function handleDailyClaim(interaction) {
  const userId = interaction.user.id;
  console.log(`[DAILY] === KLIKNIĘTO PRZYCISK daily_claim przez ${interaction.user.tag} ===`);

  if (interaction.replied || interaction.deferred) return;
  await interaction.deferUpdate().catch(() => {});

  try {
    console.log(`[DAILY] Sprawdzam isDailyReady...`);
    if (!isDailyReady(userId)) {
      console.log(`[DAILY] Nie gotowy - przerywam`);
      return await interaction.editReply({
        content: "❌ Twój Daily Quest nie jest jeszcze gotowy.",
        embeds: [],
        components: []
      });
    }

    const member = interaction.member || (interaction.guild ? interaction.guild.members.cache.get(userId) : null);
    console.log(`[DAILY] Wywołuję claimDaily...`);

    const result = await claimDaily(userId, member);

    if (!result?.success) {
      console.log(`[DAILY] Claim nieudany: ${result?.message}`);
      return await interaction.editReply({
        content: result?.message || "❌ Nie udało się odebrać daily.",
        embeds: [],
        components: []
      });
    }

    console.log(`[DAILY] Claim udany, streak = ${result.streak}, wywołuję onDailyClaimed`);
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

    console.log(`[DAILY] SUCCESS → ${interaction.user.tag} | Streak: ${result.streak}`);

  } catch (err) {
    console.error(`[DAILY] BŁĄD claim dla ${userId}:`, err);
    await interaction.editReply({
      content: "❌ Wystąpił nieoczekiwany błąd podczas odbierania daily.",
      embeds: [],
      components: []
    }).catch(() => {});
  }
}
