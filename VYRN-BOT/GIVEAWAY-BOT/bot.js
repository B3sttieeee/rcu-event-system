const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// ====================== IMPORTY SYSTEMÓW ======================
const { startVoiceXP } = require("./utils/levelSystem");
const { createTicketPanel } = require("./utils/ticketSystem");
const { startDailyReset } = require("./utils/profileSystem");
const { startClanSystem } = require("./utils/clanSystem");

// ====================== TWORZENIE KLIENTA ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
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

// ====================== ŁADOWANIE KOMEND ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");

  if (!fs.existsSync(commandsPath)) {
    console.warn("⚠️ Folder 'commands' nie istnieje!");
    return;
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
  let loaded = 0;

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));

      if (command?.data?.name && typeof command.execute === "function") {
        client.commands.set(command.data.name, command);
        console.log(`✅ Załadowano komendę: /${command.data.name}`);
        loaded++;
      } else {
        console.warn(`⚠️ Nieprawidłowa struktura komendy: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Błąd podczas ładowania komendy ${file}:`, err.message);
    }
  }

  console.log(`📊 Załadowano łącznie ${loaded} komend slash.`);
}

// ====================== ŁADOWANIE EVENTÓW ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");

  if (!fs.existsSync(eventsPath)) {
    console.warn("⚠️ Folder 'events' nie istnieje!");
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));
  let loaded = 0;

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
      loaded++;
    } catch (err) {
      console.error(`❌ Błąd podczas ładowania eventu ${file}:`, err.message);
    }
  }

  console.log(`📊 Załadowano łącznie ${loaded} eventów.`);
}

// ====================== READY EVENT ======================
client.once("ready", async () => {
  console.log("========================================");
  console.log(`🔥 Bot zalogowany jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log(`👥 Użytkownicy: ${client.users.cache.size}`);
  console.log(`⏰ Czas uruchomienia: ${new Date().toLocaleString("pl-PL")}`);
  console.log("========================================");

  // Ładowanie komend i eventów
  loadCommands();
  loadEvents();

  // Uruchomienie systemów bota
  try {
    console.log("🚀 Uruchamianie systemów...");

    startVoiceXP(client);
    startDailyReset();
    startClanSystem(client);

    // Ticket panel z opóźnieniem
    setTimeout(() => {
      createTicketPanel(client);
    }, 8000);

    console.log("✅ Wszystkie systemy uruchomione pomyślnie.");
  } catch (err) {
    console.error("❌ Błąd podczas uruchamiania systemów:", err);
  }
});

// ====================== GLOBAL ERROR HANDLING ======================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  console.error(err.stack);
  // Nie wychodzimy z procesu przy każdym błędzie (lepsze dla produkcji)
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => {
    console.log("🔑 Token zaakceptowany – logowanie w toku...");
  })
  .catch(err => {
    console.error("❌ Nie udało się zalogować bota:", err.message);
    process.exit(1);
  });
