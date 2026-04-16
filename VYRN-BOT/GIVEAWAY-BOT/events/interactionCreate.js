const { EmbedBuilder, Events } = require("discord.js");

const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleExpeditionSelect } = require("../commands/expedition");
const { isDailyReady, claimDaily } = require("../utils/profileSystem");
const { handleEmbedInteraction } = require("./modalSumbit");

async function handleDaily(interaction) {
  const userId = interaction.user.id;

  if (!isDailyReady(userId)) {
    return interaction.followUp({
      content: "Daily nie jest jeszcze gotowe do odebrania.",
      ephemeral: true
    });
  }

  const result = await claimDaily(userId, interaction.member);
  const rewardLines = [];

  if (typeof result === "number") {
    rewardLines.push(`Nagroda: \`${result}\``);
  }

  if (result && typeof result === "object") {
    if (Number.isFinite(result.coins)) {
      rewardLines.push(`Monety: \`${result.coins}\``);
    }

    if (Number.isFinite(result.xp)) {
      rewardLines.push(`XP: \`${result.xp}\``);
    }

    if (Number.isFinite(result.streak)) {
      rewardLines.push(`Streak: \`${result.streak}\``);
    }

    if (typeof result.message === "string" && result.message.trim()) {
      rewardLines.push(result.message.trim());
    }
  }

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("Daily odebrane")
    .setDescription(
      rewardLines.length
        ? rewardLines.join("\n")
        : "Nagroda za daily zostala odebrana pomyslnie."
    )
    .setTimestamp();

  return interaction.followUp({
    embeds: [embed],
    ephemeral: true
  });
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const cid = interaction.customId ?? null;

    const type = interaction.isChatInputCommand()
      ? "SLASH"
      : interaction.isButton()
        ? `BUTTON:${cid}`
        : interaction.isStringSelectMenu()
          ? `SELECT:${cid}`
          : interaction.isModalSubmit()
            ? `MODAL:${cid}`
            : "UNKNOWN";

    try {
      console.log(
        `[INTERACTION] ${type} | ${interaction.user.tag} | ${cid ?? "NONE"}`
      );

      if (await handleEmbedInteraction(interaction)) {
        return;
      }

      if (interaction.isButton() && cid?.startsWith("gw_")) {
        return await handleGiveaway(interaction);
      }

      const eventIds = new Set(["refresh", "roles", "dm", "role_menu", "dm_menu"]);

      if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        eventIds.has(cid)
      ) {
        return await handleEventInteraction(interaction);
      }

      if (
        interaction.isStringSelectMenu() &&
        cid === "expedition_time_select"
      ) {
        return await handleExpeditionSelect(interaction);
      }

      if (interaction.isButton() && cid === "daily_claim") {
        await interaction.deferUpdate().catch(() => {});
        return await handleDaily(interaction);
      }

      const ticketButtonAndModalIds = new Set([
        "open_ticket_vyrn",
        "open_ticket_v2rn",
        "close_ticket",
        "ticket_modal_vyrn",
        "ticket_modal_v2rn"
      ]);

      if (
        (interaction.isButton() || interaction.isModalSubmit()) &&
        ticketButtonAndModalIds.has(cid)
      ) {
        return await ticketSystem.handle(interaction, client);
      }

      if (
        interaction.isStringSelectMenu() &&
        cid === "clan_ticket_select"
      ) {
        return await ticketSystem.handle(interaction, client);
      }

      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);

        if (!cmd) {
          return interaction.reply({
            content: "Command not found.",
            ephemeral: true
          });
        }

        return await cmd.execute(interaction, client);
      }

      console.log(`[UNHANDLED] ${type} | ${cid ?? "NONE"}`);
    } catch (err) {
      console.error("[INTERACTION ERROR]", err);

      const payload = {
        content: "System error occurred.",
        ephemeral: true
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch {}
    }
  }
};
