const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

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

// ====================== ŁADOWANIE KOMEND (z podfolderami) ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) {
    console.warn("⚠️ Folder 'commands' nie istnieje!");
    return;
  }

  let loaded = 0;
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Podfolder (levels/, economy/, giveaway/ itp.)
      const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith(".js"));

      for (const file of commandFiles) {
        try {
          const command = require(path.join(itemPath, file));
          if (command?.data?.name && typeof command.execute === "function") {
            client.commands.set(command.data.name, command);
            console.log(`✅ Załadowano komendę: /${command.data.name} (z ${item}/)`);
            loaded++;
          } else {
            console.warn(`⚠️ Nieprawidłowa struktura komendy: ${item}/${file}`);
          }
        } catch (err) {
          console.error(`❌ Błąd ładowania ${item}/${file}:`, err.message);
        }
      }
    } 
    else if (stat.isFile() && item.endsWith(".js")) {
      // Stare komendy bezpośrednio w commands/
      try {
        const command = require(itemPath);
        if (command?.data?.name && typeof command.execute === "function") {
          client.commands.set(command.data.name, command);
          console.log(`✅ Załadowano komendę: /${command.data.name}`);
          loaded++;
        }
      } catch (err) {
        console.error(`❌ Błąd ładowania ${item}:`, err.message);
      }
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

  // ====================== URUCHOMIENIE SYSTEMÓW ======================
  try {
    console.log("🚀 Uruchamianie systemów...");

    // Level System + Voice XP
    const levelSystem = require("./utils/levelSystem");
    levelSystem.startVoiceXP(client);

    // Daily System
    const { startDailyReset } = require("./utils/profileSystem");
    if (typeof startDailyReset === "function") startDailyReset();

    // Clan System
    const { startClanSystem } = require("./utils/clanSystem");
    if (typeof startClanSystem === "function") startClanSystem(client);

    // Economy + Boost System
    const { loadCoins } = require("./utils/economySystem");
    const { loadBoosts } = require("./utils/boostSystem");

    loadCoins();
    loadBoosts();

    console.log("💰 Economy system załadowany");
    console.log("🚀 Boost system załadowany");

    // Ticket Panel z opóźnieniem
    setTimeout(async () => {
      try {
        const { createTicketPanel } = require("./utils/ticketSystem");
        await createTicketPanel(client);
        console.log("🎟 Ticket system ready");
      } catch (err) {
        console.error("❌ Ticket system failed:", err.message);
      }
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
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => {
    console.log("🔑 Token zaakceptowany – bot się uruchamia...");
  })
  .catch(err => {
    console.error("❌ Nie udało się zalogować bota:", err.message);
    process.exit(1);
  });
