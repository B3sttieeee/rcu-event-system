const fs = require('fs');
const path = require('path');

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

    // COMMANDS
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.log(err);
      }
    }

    // BUTTONS (ticket close)
    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        await interaction.channel.delete();
      }
    }
  }
};
