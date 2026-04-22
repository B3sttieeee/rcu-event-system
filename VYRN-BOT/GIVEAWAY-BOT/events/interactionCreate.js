const { EmbedBuilder, Events } = require("discord.js");

// ====================== SYSTEMS ======================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const { handleLumberjackSelect } = require("../commands/lumberjack");

// Embed Builder
const embedCommand = require("../commands/embed");

// Private Channel
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

    // 4. LUMBERJACK
    if (interaction.isStringSelectMenu() && cid === "expedition_time_select") {
      return await handleLumberjackSelect(interaction);
    }

    // 5. PRIVATE CHANNEL
    if (interaction.isStringSelectMenu() && cid.startsWith("private_panel_")) {
      return await handlePrivatePanel(interaction);
    }
    if (interaction.isModalSubmit() && cid.startsWith("private_rename_")) {
      return await handlePrivateRename(interaction);
    }
    if (interaction.isModalSubmit() && cid.startsWith("private_limit_")) {
      return await handlePrivateLimit(interaction);
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
  }
};
