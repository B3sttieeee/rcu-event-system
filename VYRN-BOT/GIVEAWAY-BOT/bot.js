const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { startVoiceXP } = require("./utils/levelSystem");
const { createTicketPanel } = require("./utils/ticketSystem");
const { startDailyReset } = require("./utils/profileSystem"); // 🔥 NOWE

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

client.commands = new Collection();

// =========================
// 📦 LOAD COMMANDS
// =========================
const commandsPath = path.join(__dirname, "commands");

if (!fs.existsSync(commandsPath)) {
  console.log("❌ Brak folderu commands");
} else {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));

      if (!command?.data?.name || typeof command.execute !== "function") {
        console.log(`⚠️ Zła komenda: ${file}`);
        continue;
      }

      client.commands.set(command.data.name, command);

    } catch (err) {
      console.log(`❌ Błąd komendy ${file}:`, err);
    }
  }
}

// =========================
// ⚡ LOAD EVENTS
// =========================
const eventsPath = path.join(__dirname, "events");

if (!fs.existsSync(eventsPath)) {
  console.log("❌ Brak folderu events");
} else {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));

      if (!event.name || typeof event.execute !== "function") {
        console.log(`⚠️ Zły event: ${file}`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

    } catch (err) {
      console.log(`❌ Błąd eventu ${file}:`, err);
    }
  }
}

// =========================
// 🔥 READY
// =========================
client.once("ready", async () => {
  console.log("=================================");
  console.log(`🔥 Zalogowano jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log("=================================");

  // 🎤 VOICE XP SYSTEM
  startVoiceXP(client);

  // 🌙 DAILY RESET SYSTEM (NOWE 🔥)
  startDailyReset();

  // 🎫 PANEL TICKET (anti spam - tylko raz)
  setTimeout(() => {
    createTicketPanel(client);
  }, 3000);
});

// =========================
// ❌ GLOBAL ERRORS
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
