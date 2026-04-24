// =====================================================
// VYRN BOT - MAIN FILE (CLEAN & STABLE)
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

// ====================== RATE LIMIT ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ${info.method} ${info.url} — ${info.timeToReset}ms`);
});

// ====================== LOAD COMMANDS ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) {
    console.warn("⚠️ Folder 'commands' nie istnieje!");
    return;
  }

  let count = 0;
  const loadFile = (filePath) => {
    try {
      delete require.cache[require.resolve(filePath)];
      const cmd = require(filePath);
      if (cmd?.data?.name && typeof cmd.execute === "function") {
        client.commands.set(cmd.data.name, cmd);
        console.log(`✅ Command: /${cmd.data.name}`);
        count++;
      }
    } catch (e) {
      console.error(`❌ CMD ERROR ${filePath}:`, e.message);
    }
  };

  const items = fs.readdirSync(commandsPath);
  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      fs.readdirSync(itemPath)
        .filter(f => f.endsWith(".js"))
        .forEach(f => loadFile(path.join(itemPath, f)));
    } else if (item.endsWith(".js")) {
      loadFile(itemPath);
    }
  }
  console.log(`📊 Commands loaded: ${count}`);
}

// ====================== LOAD EVENTS ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) {
    console.warn("⚠️ Folder 'events' nie istnieje!");
    return;
  }

  client.removeAllListeners(); // czyszczenie starych listenerów

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  let count = 0;

  for (const file of files) {
    try {
      const fullPath = path.join(eventsPath, file);
      delete require.cache[require.resolve(fullPath)];
      const event = require(fullPath);

      if (!event?.name || typeof event.execute !== "function") {
        console.warn(`⚠️ Invalid event: ${file}`);
        continue;
      }

      const runner = (...args) => event.execute(...args, client);

      if (event.once) {
        client.once(event.name, runner);
      } else {
        client.on(event.name, runner);
      }

      console.log(`✅ Event: ${event.name}`);
      count++;
    } catch (e) {
      console.error(`❌ EVENT ERROR ${file}:`, e.message);
    }
  }
  console.log(`📊 Events loaded: ${count}`);
}

// ====================== LOAD SYSTEMS ======================
async function loadSystems() {
  console.log("\n🚀 Loading systems...");

  const systems = [
    "log",
    "economy",
    "boost",
    "activity",      // ← Główny system (voice + xp + coins + level)
    "clan",
    "rules",
    "event",
    "giveaway",
    "tickets",
    "privatevc"
  ];

  for (const sysName of systems) {
    try {
      const sysPath = `./systems/${sysName}`;
      delete require.cache[require.resolve(sysPath)]; // odświeżenie cache

      const sys = require(sysPath);

      if (typeof sys.init === "function") {
        const result = sys.init(client);
        if (result instanceof Promise) await result;
        console.log(`✅ ${sysName.padEnd(12)} → OK`);
      } else {
        console.log(`⚠️ ${sysName.padEnd(12)} → brak init()`);
      }
    } catch (e) {
      console.error(`❌ ${sysName.padEnd(12)} → ERROR: ${e.message}`);
    }
  }
  console.log("🎉 All systems loaded!\n");
}

// ====================== READY ======================
client.once("ready", async () => {
  console.log("================================");
  console.log(`🔥 Logged in as ${client.user.tag}`);
  console.log(`📊 Guilds: ${client.guilds.cache.size}`);
  console.log("================================");

  loadCommands();
  loadEvents();
  await loadSystems();

  console.log("✅ BOT READY & STABLE");
});

// ====================== GLOBAL ERROR HANDLING ======================
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 Login successful"))
  .catch(err => {
    console.error("❌ LOGIN ERROR:", err.message);
    process.exit(1);
  });
