const { REST, Routes } = require('discord.js');
const fs = require('fs');

const { createTicketPanel } = require('./ticketSystem');

module.exports = {
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log(`🔥 ${client.user.tag} READY`);

    try {
      const commands = [];
      const files = fs.readdirSync('./commands');

      for (const file of files) {
        const cmd = require(`../commands/${file}`);
        commands.push(cmd.data.toJSON());
      }

      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

      console.log("✅ Commands deployed");

      // ticket panel
      await createTicketPanel(client);

    } catch (err) {
      console.log("❌ READY ERROR:", err);
    }
  }
};
