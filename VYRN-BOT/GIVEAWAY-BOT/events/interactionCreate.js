const { Events } = require("discord.js");

// SYSTEMS
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleLumberjackSelect } = require("../commands/lumberjack");
const embedCommand = require("../commands/embed");

// PRIVATE VC (FIX)
const privateVC = require("../utils/privateChannelSystem");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const cid = interaction.customId;

    console.log(
      `[INTERACTION] ${interaction.type} | ${interaction.user.tag} | ${cid ?? "NONE"}`
    );

    // EMBED
    if (interaction.isModalSubmit() && cid?.startsWith("embedModal_")) {
      return embedCommand.handleModal(interaction);
    }

    // GIVEAWAY
    if (interaction.isButton() && cid?.startsWith("gw_")) {
      return handleGiveaway(interaction);
    }

    // EVENT SYSTEM
    const eventIds = ["refresh", "roles", "dm", "role_menu", "dm_menu"];

    if (
      (interaction.isButton() || interaction.isStringSelectMenu()) &&
      eventIds.includes(cid)
    ) {
      return handleEventInteraction(interaction);
    }

    // LUMBERJACK
    if (
      interaction.isStringSelectMenu() &&
      cid === "expedition_time_select"
    ) {
      return handleLumberjackSelect(interaction);
    }

    // ================= PRIVATE VC (FIXED SYSTEM) =================

    if (interaction.isButton() && cid?.startsWith("vc_")) {
      return privateVC.handlePrivatePanel(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      cid?.startsWith("vc_rename_")
    ) {
      return privateVC.handleRename(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      cid?.startsWith("vc_limit_")
    ) {
      return privateVC.handleLimit(interaction);
    }

    // TICKET SYSTEM
    const ticketIds = [
      "clan_ticket_select",
      "open_ticket_vyrn",
      "open_ticket_v2rn",
      "close_ticket",
      "ticket_modal_vyrn",
      "ticket_modal_v2rn"
    ];

    if (
      (interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()) &&
      ticketIds.includes(cid)
    ) {
      return ticketSystem.handle(interaction, client);
    }

    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) {
        return interaction.reply({
          content: "❌ Not found",
          ephemeral: true
        });
      }

      return cmd.execute(interaction, client);
    }
  }
};
