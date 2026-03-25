const ticketSystem = require('./ticketSystem');
const fs = require('fs');

const commands = new Map();

// 🔥 Ładujemy komendy tylko RAZ (lepiej niż za każdym interaction)
const commandFiles = fs.readdirSync('./commands');

for (const file of commandFiles) {
  try {
    const cmd = require(`../commands/${file}`);
    if (cmd.data && cmd.execute) {
      commands.set(cmd.data.name, cmd);
      console.log(`✅ Loaded command: ${cmd.data.name}`);
    } else {
      console.log(`⚠️ Invalid command file: ${file}`);
    }
  } catch (err) {
    console.log("❌ COMMAND LOAD ERROR:", file, err);
  }
}

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
        await ticketSystem.handle(interaction);
      }

      // =========================
      // 🎮 SLASH COMMANDS
      // =========================
      if (!interaction.isChatInputCommand()) return;

      const command = commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction, client);

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Error occurred',
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '❌ Error occurred',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
