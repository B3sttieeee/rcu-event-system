const fs = require('fs');
const path = require('path');
const { handleTicket } = require('./ticketSystem');

const commands = new Map();

// load commands
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands'));

for (const file of commandFiles) {
  const cmd = require(`../commands/${file}`);
  commands.set(cmd.data.name, cmd);
}

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    try {

      // ===== COMMANDS =====
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction);
      }

      // ===== BUTTONS =====
      if (interaction.isButton()) {
        await handleTicket(interaction);
      }

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);
    }
  }
};
