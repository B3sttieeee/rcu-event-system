// =====================================================
// VYRN BOT - HYBRID MODULAR BOT
// =====================================================
const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config(); // tylko do lokalnego testowania (na Railway niepotrzebne)

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

// ====================== RATE LIMIT LOGGING ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ${info.method} ${info.url} — ${info.timeToReset}ms`);
});

// ====================== LOAD COMMANDS ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) {
    return console.warn("⚠️ Folder 'commands' nie istnieje!");
  }

  let loaded = 0;
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

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

    if (stat.isDirectory()) {
      fs.readdirSync(itemPath)
        .filter(f => f.endsWith(".js"))
        .forEach(f => loadFile(path.join(itemPath, f)));
    } else if (item.endsWith(".js")) {
      loadFile(itemPath);
    }
  }
  console.log(`📊 Załadowano ${loaded} komend slash`);
}

// ====================== LOAD EVENTS ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) {
    return console.warn("⚠️ Folder 'events' nie istnieje!");
  }

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
  console.log("🚀 Ładowanie systemów modularnych...");

  const systems = [
    { name: "boost",      path: "./systems/boost" },
    { name: "clan",       path: "./systems/clan" },
    { name: "economy",    path: "./systems/economy" },
    { name: "event",      path: "./systems/event" },
    { name: "giveaway",   path: "./systems/giveaway" },
    { name: "level",      path: "./systems/level" },
    { name: "log",        path: "./systems/log" },
    { name: "privatevc",  path: "./systems/privatevc" },
    { name: "profile",    path: "./systems/profile" },
    { name: "rules",      path: "./systems/rules" },
    { name: "tickets",    path: "./systems/tickets" }
  ];

  for (const sys of systems) {
    try {
      const system = require(sys.path);
      if (typeof system.init === "function") {
        await system.init(client);
        console.log(`✅ ${sys.name} system → załadowany`);
      } else if (typeof system.load === "function") {
        await system.load(client);
        console.log(`✅ ${sys.name} system → załadowany`);
      } else {
        console.log(`✅ ${sys.name} system → załadowany (bez init/load)`);
      }
    } catch (e) {
      console.error(`❌ ${sys.name} system error:`, e.message);
    }
  }

  console.log("🎉 Wszystkie systemy modularne załadowane");
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

  console.log("✅ BOT W PEŁNI GOTOWY - HYBRID MODULAR");
});

// ====================== GLOBAL ERROR HANDLING ======================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});
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
