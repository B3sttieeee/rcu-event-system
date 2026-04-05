const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { startVoiceXP } = require("./utils/levelSystem");
const { createTicketPanel } = require("./utils/ticketSystem");
const { startDailyReset } = require("./utils/profileSystem");
const { startClanSystem } = require("./utils/clanSystem");

// ====================== CLIENT ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,      // Wymagany dla guildMemberAdd
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

client.commands = new Collection();

// ====================== RATE LIMIT HANDLER ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ${info.method} ${info.url} — Retry after: ${info.timeToReset}ms`);
});

// ====================== LOAD COMMANDS ======================
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      if (command?.data?.name && typeof command.execute === "function") {
        client.commands.set(command.data.name, command);
        console.log(`✅ Załadowano komendę: ${command.data.name}`);
      } else {
        console.warn(`⚠️ Nieprawidłowa komenda: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Błąd podczas ładowania komendy ${file}:`, err);
    }
  }
} else {
  console.warn("❌ Folder 'commands' nie istnieje!");
}

// ====================== LOAD EVENTS ======================
const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name || typeof event.execute !== "function") {
        console.warn(`⚠️ Nieprawidłowy event: ${file}`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`✅ Załadowano event: ${event.name}`);
    } catch (err) {
      console.error(`❌ Błąd podczas ładowania eventu ${file}:`, err);
    }
  }
} else {
  console.warn("❌ Folder 'events' nie istnieje!");
}

// ====================== READY EVENT ======================
client.once("ready", async () => {
  console.log("=================================");
  console.log(`🔥 Zalogowano jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log("=================================");

  // Uruchom systemy
  startVoiceXP(client);
  startDailyReset();
  startClanSystem(client);

  // Ticket panel z małym opóźnieniem
  setTimeout(() => {
    createTicketPanel(client);
  }, 5000);
});

// ====================== GLOBAL ERROR HANDLING ======================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN);
