const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const { createTicketPanel } = require("../utils/ticketSystem");
const eventSystem = require("../utils/eventSystem");
const { loadGiveaways } = require("../utils/giveawaySystem");

// 🔥 LEVEL SYSTEM (UTILS)
const levelSystem = require("../utils/levelSystem");

module.exports = {
  name: "clientReady",
  once: true,

  async execute(client) {
    console.log(`🔥 ${client.user.tag} READY`);

    try {

      // =========================
      // 📦 LOAD COMMANDS
      // =========================
      const commands = [];
      const commandsPath = path.join(__dirname, "../commands");
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

      for (const file of commandFiles) {
        try {
          const command = require(`../commands/${file}`);
          if (command?.data) {
            commands.push(command.data.toJSON());
          }
        } catch (err) {
          console.log("❌ Command load error:", file, err);
        }
      }

      // =========================
      // 🚀 REGISTER SLASH
      // =========================
      const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );

      console.log("✅ Commands deployed");

      // =========================
      // 🎫 TICKET PANEL
      // =========================
      await createTicketPanel(client);
      console.log("🎟 Ticket panel loaded");

      // =========================
      // 🎮 EVENT SYSTEM
      // =========================
      if (eventSystem) {

        if (typeof eventSystem.startPanel === "function") {
          await eventSystem.startPanel(client);
        }

        if (typeof eventSystem.startEventSystem === "function") {
          await eventSystem.startEventSystem(client);
        }

        console.log("✨ Event system started");
      }

      // =========================
      // 🎉 LOAD GIVEAWAYS
      // =========================
      if (typeof loadGiveaways === "function") {
        await loadGiveaways(client);
        console.log("🎁 Giveaways loaded");
      }

      // =========================
      // 🎤 LEVEL SYSTEM (VOICE XP)
      // =========================
      if (levelSystem && typeof levelSystem.startVoiceXP === "function") {
        levelSystem.startVoiceXP(client);
        console.log("🎤 Voice XP system started");
      }

    } catch (err) {
      console.log("❌ READY ERROR:", err);
    }
  }
};
