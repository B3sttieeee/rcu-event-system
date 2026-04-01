const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ===== COMMANDS =====
client.commands = new Collection();

// =========================
// 📦 LOAD COMMANDS
// =========================
const commandsPath = path.join(__dirname, "commands");

if (!fs.existsSync(commandsPath)) {
  console.log("❌ Brak folderu /commands");
} else {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    try {
      const command = require(filePath);

      if (!command?.data?.name || typeof command.execute !== "function") {
        console.log(`⚠️ Invalid command: ${file}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`📦 Loaded command: ${command.data.name}`);

    } catch (err) {
      console.log(`❌ Error loading command ${file}:`, err);
    }
  }
}

// =========================
// ⚡ LOAD EVENTS
// =========================
const eventsPath = path.join(__dirname, "events");

if (!fs.existsSync(eventsPath)) {
  console.log("❌ Brak folderu /events");
} else {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);

    try {
      const event = require(filePath);

      if (!event.name || typeof event.execute !== "function") {
        console.log(`⚠️ Invalid event: ${file}`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      console.log(`✅ Loaded event: ${event.name}`);

    } catch (err) {
      console.log(`❌ Error loading event ${file}:`, err);
    }
  }
}

// =========================
// 🔥 READY
// =========================
client.once("ready", () => {
  console.log("=================================");
  console.log(`🔥 Zalogowano jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log("=================================");

  // 🔥 AUTO START SYSTEMÓW (jeśli istnieją)
  try {
    const eventSystem = require("./utils/eventSystem");
    eventSystem.startPanel(client);
    eventSystem.startEventSystem(client);
  } catch {}

  try {
    const ticketSystem = require("./utils/ticketSystem");
    ticketSystem.createTicketPanel(client);
  } catch {}

  try {
    const giveawaySystem = require("./utils/giveawaySystem");
    giveawaySystem.loadGiveaways(client);
  } catch {}

  try {
    const levelSystem = require("./utils/levelSystem");
    levelSystem.startVoiceXP(client);
  } catch {}
});

// =========================
// ❌ GLOBAL ERROR HANDLING
// =========================
process.on("unhandledRejection", err => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", err => {
  console.error("❌ Uncaught Exception:", err);
});

// =========================
// 🚀 LOGIN
// =========================
client.login(process.env.TOKEN);
