const { Events } = require("discord.js");

// SYSTEMS
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleLumberjackSelect } = require("../commands/lumberjack");
const embedCommand = require("../commands/embed");

// PRIVATE VC
const {
  handlePrivatePanel,
  handlePrivateRename,
  handlePrivateLimit,
  handlePrivateButton
} = require("../utils/privateChannelSystem");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const cid = interaction.customId;

    console.log(`[INTERACTION] ${interaction.type} | ${interaction.user.tag} | ${cid ?? "NONE"}`);

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

    // ================= PRIVATE VC (NOW BUTTON BASED) =================
    if (interaction.isButton() && cid?.startsWith("vc_")) {
      return handlePrivateButton(interaction);
    }

    if (interaction.isModalSubmit() && cid?.startsWith("private_rename_")) {
      return handlePrivateRename(interaction);
    }

    if (interaction.isModalSubmit() && cid?.startsWith("private_limit_")) {
      return handlePrivateLimit(interaction);
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
      (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) &&
      ticketIds.includes(cid)
    ) {
      return ticketSystem.handle(interaction, client);
    }

    // SLASH
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return interaction.reply({ content: "❌ Not found", ephemeral: true });

      return cmd.execute(interaction, client);
    }
  }
};
