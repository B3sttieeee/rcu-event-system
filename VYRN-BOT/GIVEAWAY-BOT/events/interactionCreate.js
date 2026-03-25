const fs = require('fs');
const ticketSystem = require('../utils/ticketSystem');
const eventSystem = require('../utils/eventSystem');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    try {

      // =========================
      // 🎫 TICKET SYSTEM
      // =========================
      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        if (ticketSystem && typeof ticketSystem.handle === "function") {
          await ticketSystem.handle(interaction, client);
        }
      }

      // =========================
      // 🎮 EVENT SYSTEM (BUTTONY + MENU)
      // =========================

      // ===== BUTTONY =====
      if (interaction.isButton()) {

        // 🔄 REFRESH
        if (interaction.customId === "refresh") {
          return interaction.update({
            embeds: [eventSystem.panelEmbed()],
            components: eventSystem.getPanelButtons()
          });
        }

        // 🎭 ROLE BUTTON
        if (interaction.customId === "roles") {
          return interaction.reply({
            content: "🎭 Select roles:",
            components: [eventSystem.rolesMenu()],
            ephemeral: true
          });
        }

        // 📩 DM BUTTON
        if (interaction.customId === "dm") {
          return interaction.reply({
            content: "📩 Select notifications:",
            components: [eventSystem.dmMenu()],
            ephemeral: true
          });
        }
      }

      // ===== SELECT MENU =====
      if (interaction.isStringSelectMenu()) {

        const ROLES = {
          egg: "1476000993119568105",
          merchant: "1476000993660502139",
          spin: "1484911421903999127"
        };

        // 🎭 ROLE SELECT
        if (interaction.customId === "roles_menu") {
          const member = await interaction.guild.members.fetch(interaction.user.id);

          // usuń stare
          for (const key in ROLES) {
            await member.roles.remove(ROLES[key]).catch(()=>{});
          }

          // dodaj nowe
          for (const val of interaction.values) {
            await member.roles.add(ROLES[val]).catch(()=>{});
          }

          return interaction.reply({
            content: "✅ Roles updated",
            ephemeral: true
          });
        }

        // 📩 DM SELECT
        if (interaction.customId === "dm_menu") {
          return interaction.reply({
            content: "✅ Notifications saved",
            ephemeral: true
          });
        }
      }

      // =========================
      // ⚡ SLASH COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      const commandFiles = fs.readdirSync('./commands');
      const commands = new Map();

      for (const file of commandFiles) {
        try {
          const command = require(`../commands/${file}`);
          if (command?.data?.name) {
            commands.set(command.data.name, command);
          }
        } catch (err) {
          console.log("❌ COMMAND LOAD ERROR:", file, err);
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
            content: '❌ Wystąpił błąd',
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ Wystąpił błąd',
            ephemeral: true
          });
        }
      } catch {}
    }
  }
};
