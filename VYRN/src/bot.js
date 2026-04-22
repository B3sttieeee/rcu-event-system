// =====================================================
// VYRN BOT - HYBRID MODULAR ARCHITECTURE
// =====================================================
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

require("dotenv").config(); // tylko do lokalnego developmentu

// ====================== CLIENT ======================
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

// Rate limit logging
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ${info.method} ${info.url} — ${info.timeToReset}ms`);
});

// ====================== LOAD COMMANDS ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return console.warn("⚠️ Folder 'commands' nie istnieje!");

  let loaded = 0;
  const loadFile = (filePath) => {
    try {
      const cmd = require(filePath);
      if (cmd?.data?.name && typeof cmd.execute === "function") {
        client.commands.set(cmd.data.name, cmd);
        console.log(`✅ Loaded command: /${cmd.data.name}`);
        loaded++;
      }
    } catch (e) {
      console.error(`❌ CMD ERROR ${filePath}:`, e.message);
    }
  };

  const items = fs.readdirSync(commandsPath);
  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      fs.readdirSync(itemPath)
        .filter(f => f.endsWith(".js"))
        .forEach(f => loadFile(path.join(itemPath, f)));
    } else if (item.endsWith(".js")) {
      loadFile(itemPath);
    }
  }
  console.log(`📊 Załadowano ${loaded} komend`);
}

// ====================== LOAD EVENTS ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return console.warn("⚠️ Folder 'events' nie istnieje!");

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  let loaded = 0;

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event?.name || typeof event.execute !== "function") continue;

      const runner = (...args) => event.execute(...args, client);

      if (event.once) {
        client.once(event.name, runner);
      } else {
        client.on(event.name, runner);
      }

      console.log(`✅ Loaded event: ${event.name}`);
      loaded++;
    } catch (e) {
      console.error(`❌ EVENT ERROR ${file}:`, e.message);
    }
  }
  console.log(`📊 Załadowano ${loaded} eventów`);
}

// ====================== LOAD SYSTEMS ======================
async function loadSystems() {
  console.log("\n🚀 Ładowanie systemów modularnych...");

  const systemsList = [
    { name: "log",        path: "./systems/log" },
    { name: "economy",    path: "./systems/economy" },
    { name: "boost",      path: "./systems/boost" },
    { name: "profile",    path: "./systems/profile" },
    { name: "level",      path: "./systems/level" },
    { name: "clan",       path: "./systems/clan" },
    { name: "rules",      path: "./systems/rules" },
    { name: "event",      path: "./systems/event" },
    { name: "giveaway",   path: "./systems/giveaway" },
    { name: "tickets",    path: "./systems/tickets" },
    { name: "privatevc",  path: "./systems/privatevc" },
  ];

  for (const sys of systemsList) {
    try {
      const system = require(sys.path);
      if (typeof system.init === "function") {
        await system.init(client);
        console.log(`✅ ${sys.name.padEnd(10)} → załadowany`);
      } else {
        console.log(`✅ ${sys.name.padEnd(10)} → załadowany (bez init)`);
      }
    } catch (e) {
      console.error(`❌ ${sys.name.padEnd(10)} → błąd: ${e.message}`);
    }
  }

  console.log("🎉 Wszystkie systemy modularne załadowane pomyślnie!\n");
}

// ====================== READY ======================
client.once("ready", async () => {
  console.log("================================");
  console.log(`🔥 Bot zalogowany jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log("================================");

  loadCommands();
  loadEvents();
  await loadSystems();

  console.log("✅ VYRN BOT w pełni gotowy do działania!");
});

// ====================== GLOBAL ERROR HANDLING ======================
process.on("unhandledRejection", (err) => console.error("❌ Unhandled Rejection:", err));
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 Logowanie zakończone sukcesem"))
  .catch(err => {
    console.error("❌ BŁĄD LOGOWANIA:", err.message);
    process.exit(1);
  });
