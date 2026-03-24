eventsconst { REST, Routes } = require('discord.js');
const fs = require('fs');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`🔥 ${client.user.tag} READY`);

    const commands = [];
    const files = fs.readdirSync('./commands');

    for (const file of files) {
      const cmd = require(`../commands/${file}`);
      commands.push(cmd.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

    console.log("✅ Commands loaded");
  }
};
