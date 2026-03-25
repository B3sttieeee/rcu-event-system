const fs = require("fs");
const ticketSystem = require("../utils/ticketSystem");
const eventSystem = require("../utils/eventSystem");
const giveawaySystem = require("../utils/giveawaySystem");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // =========================
      // 🎫 TICKET
      // =========================
      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        if (ticketSystem?.handle) {
          await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // 🎁 GIVEAWAY BUTTONS
      // =========================
      if (interaction.isButton()) {
        await giveawaySystem.handle(interaction);
      }

      // =========================
      // 🎮 EVENT SYSTEM
      // =========================
      if (interaction.isButton()) {

        if (interaction.customId === "refresh") {
          return interaction.update({
            embeds: [eventSystem.panelEmbed()],
            components: eventSystem.getPanelButtons()
          });
        }

        if (interaction.customId === "roles") {
          return interaction.reply({
            content: "🎭 Select roles:",
            components: [eventSystem.rolesMenu()],
            ephemeral: true
          });
        }

        if (interaction.customId === "dm") {
          return interaction.reply({
            content: "📩 Select notifications:",
            components: [eventSystem.dmMenu()],
            ephemeral: true
          });
        }
      }

      if (interaction.isStringSelectMenu()) {

        const ROLES = {
          egg: "1476000993119568105",
          merchant: "1476000993660502139",
          spin: "1484911421903999127"
        };

        if (interaction.customId === "roles_menu") {
          const member = await interaction.guild.members.fetch(interaction.user.id);

          for (const key in ROLES) {
            await member.roles.remove(ROLES[key]).catch(()=>{});
          }

          for (const val of interaction.values) {
            await member.roles.add(ROLES[val]).catch(()=>{});
          }

          return interaction.reply({
            content: "✅ Roles updated",
            ephemeral: true
          });
        }

        if (interaction.customId === "dm_menu") {
          return interaction.reply({
            content: "✅ Notifications saved",
            ephemeral: true
          });
        }
      }

      // =========================
      // ⚡ COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      const commandFiles = fs.readdirSync("./commands");
      const commands = new Map();

      for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        if (command?.data?.name) {
          commands.set(command.data.name, command);
        }
      }

      const cmd = commands.get(interaction.commandName);
      if (!cmd) return;

      await cmd.execute(interaction, client);

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "❌ Error",
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: "❌ Error",
            ephemeral: true
          });
        }
      } catch {}
    }
  }
};
