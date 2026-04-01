const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { startVoiceXP } = require("./utils/levelSystem");
const { createTicketPanel } = require("./utils/ticketSystem");

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

const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// =========================
// ⚡ LOAD EVENTS
// =========================
const eventsPath = path.join(__dirname, "events");

const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// =========================
// 🔥 READY
// =========================
client.once("ready", async () => {
  console.log(`🔥 Zalogowano jako ${client.user.tag}`);

  // 🔥 XP VOICE SYSTEM
  startVoiceXP(client);

  // 🔥 TICKET PANEL
  createTicketPanel(client);
});

// =========================
// ❌ ERRORS
// =========================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// =========================
// 🚀 LOGIN
// =========================
client.login(process.env.TOKEN);
