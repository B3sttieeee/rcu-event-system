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

// Embed Builder
const embedCommand = require("../commands/embed");

// Private Channel System
const {
  handlePrivatePanel,
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

      // 1. EMBED BUILDER
      if (interaction.isModalSubmit() && interaction.customId.startsWith("embedModal_")) {
        return await embedCommand.handleModal(interaction);
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

      // 4. LUMBERJACK / EXPEDITION
      if (interaction.isStringSelectMenu() && cid === "expedition_time_select") {
        return await handleLumberjackSelect(interaction);
      }

      // 5. PRIVATE CHANNEL PANEL
      if (interaction.isStringSelectMenu() && cid.startsWith("private_panel_")) {
        return await handlePrivatePanel(interaction);
      }

      if (interaction.isModalSubmit() && cid.startsWith("private_rename_")) {
        return await handlePrivateRename(interaction);
      }

      if (interaction.isModalSubmit() && cid.startsWith("private_limit_")) {
        return await handlePrivateLimit(interaction);
      }

      // ====================== DAILY CLAIM HANDLER ======================
      if (interaction.isButton() && cid === "daily_claim") {
        console.log(`[DAILY] Kliknięto daily_claim przez ${interaction.user.tag}`);
        return await handleDailyClaim(interaction);
      }

      // 6. TICKET SYSTEM
      const ticketIds = ["open_ticket_vyrn", "open_ticket_v2rn", "close_ticket", "ticket_modal_vyrn", "ticket_modal_v2rn"];
      if ((interaction.isButton() || interaction.isModalSubmit()) && ticketIds.includes(cid)) {
        return await ticketSystem.handle(interaction, client);
      }

      // 7. SLASH COMMANDS
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
          return interaction.reply({ content: "❌ Command not found.", ephemeral: true });
        }
        return await cmd.execute(interaction, client);
      }

      console.log(`[UNHANDLED] ${type} | ${cid}`);
    } catch (err) {
      console.error("❌ INTERACTION ERROR:", err);
      const payload = { content: "❌ System error occurred.", ephemeral: true };
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

// ====================== DAILY CLAIM HANDLER ======================
async function handleDailyClaim(interaction) {
  const userId = interaction.user.id;
  console.log(`[DAILY] Wywołuję claimDaily dla ${userId}`);

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

    const member = interaction.member || (interaction.guild ? await interaction.guild.members.fetch(userId).catch(() => null) : null);

    const result = await claimDaily(userId, member);

    if (!result?.success) {
      return await interaction.editReply({
        content: result?.message || "❌ Nie udało się odebrać daily.",
        embeds: [],
        components: []
      });
    }

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

    console.log(`[DAILY] SUCCESS → ${interaction.user.tag} | Nowy streak: ${result.streak}`);

  } catch (err) {
    console.error(`[DAILY] BŁĄD claim dla ${userId}:`, err);
    await interaction.editReply({
      content: "❌ Wystąpił nieoczekiwany błąd podczas odbierania daily.",
      embeds: [],
      components: []
    }).catch(() => {});
  }
}
