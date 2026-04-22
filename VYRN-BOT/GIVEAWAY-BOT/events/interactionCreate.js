const { Events } = require("discord.js");

// ================= SYSTEMS =================
const ticketSystem = require("../utils/ticketSystem");
const { handleEventInteraction } = require("../utils/eventSystem");
const { handleGiveaway } = require("../utils/giveawaySystem");
const {
  handleLumberjackSelect
} = require("../commands/lumberjack");
const embedCommand = require("../commands/embed");

// ================= PRIVATE VC =================
const privateVC = require("../utils/privateChannelSystem");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const cid = interaction.customId || "NONE";

    console.log(
      `[INTERACTION] ${interaction.type} | ${interaction.user.tag} | ${cid}`
    );

    try {

      // =====================================================
      // EMBED MODAL
      // =====================================================
      if (
        interaction.isModalSubmit() &&
        cid.startsWith("embedModal_")
      ) {
        return embedCommand.handleModal(interaction);
      }

      // =====================================================
      // GIVEAWAY
      // =====================================================
      if (
        interaction.isButton() &&
        cid.startsWith("gw_")
      ) {
        return handleGiveaway(interaction);
      }

      // =====================================================
      // EVENT SYSTEM
      // =====================================================
      const eventIds = [
        "refresh",
        "roles",
        "dm",
        "role_menu",
        "dm_menu"
      ];

      if (
        (interaction.isButton() ||
          interaction.isStringSelectMenu()) &&
        eventIds.includes(cid)
      ) {
        return handleEventInteraction(interaction);
      }

      // =====================================================
      // LUMBERJACK PICKERS
      // =====================================================
      if (
        interaction.isStringSelectMenu() &&
        (
          cid === "lumberjack_location" ||
          cid === "lumberjack_duration"
        )
      ) {
        return handleLumberjackSelect(interaction);
      }

      // =====================================================
      // PRIVATE VC BUTTONS
      // =====================================================
      if (
        interaction.isButton() &&
        cid.startsWith("vc_")
      ) {
        return privateVC.handlePrivatePanel(interaction);
      }

      // =====================================================
      // PRIVATE VC PICKERS
      // =====================================================
      if (
        interaction.isStringSelectMenu() &&
        (
          cid.startsWith("vc_kickselect_") ||
          cid.startsWith("vc_banselect_")
        )
      ) {
        return privateVC.handlePrivateSelect(interaction);
      }

      // =====================================================
      // PRIVATE VC MODALS
      // =====================================================
      if (
        interaction.isModalSubmit() &&
        cid.startsWith("vc_rename_")
      ) {
        return privateVC.handleRename(interaction);
      }

      if (
        interaction.isModalSubmit() &&
        cid.startsWith("vc_limit_")
      ) {
        return privateVC.handleLimit(interaction);
      }

      // =====================================================
      // TICKET SYSTEM
      // clan_ticket_select
      // close_ticket
      // ticket_modal_vyrn
      // ticket_modal_staff
      // =====================================================
      if (
        (
          interaction.isButton() ||
          interaction.isStringSelectMenu() ||
          interaction.isModalSubmit()
        ) &&
        (
          cid === "clan_ticket_select" ||
          cid === "close_ticket" ||
          cid.startsWith("ticket_modal_")
        )
      ) {
        return ticketSystem.handle(interaction, client);
      }

      // =====================================================
      // SLASH COMMANDS
      // =====================================================
      if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(
          interaction.commandName
        );

        if (!cmd) {
          return interaction.reply({
            content: "❌ Command not found.",
            ephemeral: true
          });
        }

        return cmd.execute(interaction, client);
      }

    } catch (err) {
      console.error("[INTERACTION ERROR]", err);

      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: "❌ Interaction error.",
          ephemeral: true
        });
      }
    }
  }
};
