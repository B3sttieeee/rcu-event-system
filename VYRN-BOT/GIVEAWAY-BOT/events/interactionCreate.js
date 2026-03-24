const ticketSystem = require('./ticketSystem');
const fs = require('fs');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {

    try {

      // ===== TICKET SYSTEM (BUTTONS / MODALS / SELECT) =====
      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        await ticketSystem.handle(interaction);
      }

      // ===== SLASH COMMANDS =====
      if (!interaction.isChatInputCommand()) return;

      const commandFiles = fs.readdirSync('./commands');
      const commands = new Map();

      for (const file of commandFiles) {
        try {
          const cmd = require(`../commands/${file}`);
          commands.set(cmd.data.name, cmd);
        } catch (err) {
          console.log("❌ COMMAND LOAD ERROR:", file, err);
        }
      }

      const command = commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      if (interaction.replied || interaction.deferred) {
        interaction.followUp({
          content: '❌ Error occurred',
          ephemeral: true
        }).catch(() => {});
      } else {
        interaction.reply({
          content: '❌ Error occurred',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
