// =====================================================
// VYRN BOT - MAIN FILE (CLEAN, STABLE & OPTIMIZED)
// =====================================================
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

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

// ====================== RATE LIMIT HANDLING ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ⚠️ ${info.method} ${info.url} — Reset za: ${info.timeToReset}ms`);
});

// ====================== COMMAND LOADER ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return console.warn("⚠️ Folder 'commands' nie istnieje!");

  let count = 0;
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    
    // Obsługa podfolderów w komendach
    if (fs.statSync(itemPath).isDirectory()) {
      const subFiles = fs.readdirSync(itemPath).filter(f => f.endsWith(".js"));
      for (const file of subFiles) {
        const filePath = path.join(itemPath, file);
        const cmd = require(filePath);
        if (cmd?.data?.name) {
          client.commands.set(cmd.data.name, cmd);
          count++;
        }
      }
    } else if (item.endsWith(".js")) {
      const cmd = require(itemPath);
      if (cmd?.data?.name) {
        client.commands.set(cmd.data.name, cmd);
        count++;
      }
    }
  }
  console.log(`✅ Załadowano komendy: ${count}`);
}

// ====================== EVENT LOADER ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return console.warn("⚠️ Folder 'events' nie istnieje!");

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  let count = 0;

  for (const file of files) {
    try {
      const fullPath = path.join(eventsPath, file);
      const event = require(fullPath);

      if (!event?.name || typeof event.execute !== "function") continue;

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      count++;
    } catch (e) {
      console.error(`❌ BŁĄD EVENTU [${file}]:`, e.message);
    }
  }
  console.log(`✅ Załadowano eventy: ${count}`);
}

// ====================== SYSTEMS LOADER ======================
async function loadSystems() {
  console.log("\n🚀 Inicjalizacja systemów...");

  const systems = [
    "log",
    "economy",      // Economy musi być przed Activity
    "boost",
    "activity",     // Activity potrzebuje Economy
    "clan",
    "rules",
    "event",
    "giveaway",
    "tickets",
    "privatevc",
    "voiceRewards"  // Nagrody za voice
  ];

  for (const sysName of systems) {
    try {
      const sysPath = path.join(__dirname, "systems", sysName);
      
      // Sprawdź czy folder istnieje
      if (!fs.existsSync(sysPath)) {
        console.log(`⚠️ ${sysName.padEnd(12)} → folder nie istnieje`);
        continue;
      }

      const sys = require(sysPath);

      if (typeof sys.init === "function") {
        const result = sys.init(client);
        if (result instanceof Promise) await result;
        console.log(`✅ ${sysName.padEnd(12)} → OK`);
      } else {
        console.log(`ℹ️ ${sysName.padEnd(12)} → załadowany (brak init)`);
      }
    } catch (e) {
      console.error(`❌ ${sysName.padEnd(12)} → BŁĄD: ${e.message}`);
    }
  }
  console.log("🎉 Wszystkie systemy gotowe!\n");
}

// ====================== READY EVENT ======================
client.once("ready", async () => {
  console.log("================================");
  console.log(`🔥 Zalogowano jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log("================================");

  loadCommands();
  loadEvents();
  await loadSystems();

  console.log("✅ VYRN BOT READY & STABLE");
});

// ====================== GLOBAL ERROR HANDLING ======================
process.on("unhandledRejection", (err) => {
  console.error("❌ Krytyczny błąd (Unhandled Rejection):", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Krytyczny błąd (Uncaught Exception):", err);
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 Połączenie z Discordem nawiązane"))
  .catch(err => {
    console.error("❌ BŁĄD LOGOWANIA:", err.message);
    process.exit(1);
  });
