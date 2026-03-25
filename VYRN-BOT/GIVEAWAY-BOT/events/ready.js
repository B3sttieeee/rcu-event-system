const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const { createTicketPanel } = require("./utils/ticketSystem");

module.exports = {
  name: "clientReady",
  once: true,

  async execute(client) {
    console.log(`🔥 ${client.user.tag} READY`);

    try {

      // ===== LOAD COMMANDS =====
      const commands = [];
      const commandsPath = path.join(__dirname, "../commands");
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

      for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        if (command.data) {
          commands.push(command.data.toJSON());
        }
      }

      // ===== REGISTER COMMANDS =====
      const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );

      console.log("✅ Commands deployed");

      // ===== TICKET PANEL =====
      await createTicketPanel(client);

      console.log("🎟 Ticket panel loaded");

    } catch (err) {
      console.log("❌ READY ERROR:", err);
    }
  }
};
