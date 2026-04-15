const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

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

// ====================== RATE LIMIT ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ${info.method} ${info.url} — ${info.timeToReset}ms`);
});

// ====================== COMMANDS ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return console.warn("⚠️ commands folder missing");

  let loaded = 0;

  const items = fs.readdirSync(commandsPath);
  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      const files = fs.readdirSync(itemPath).filter(f => f.endsWith(".js"));

      for (const file of files) {
        try {
          const cmd = require(path.join(itemPath, file));
          if (cmd?.data?.name && typeof cmd.execute === "function") {
            client.commands.set(cmd.data.name, cmd);
            console.log(`✅ /${cmd.data.name}`);
            loaded++;
          }
        } catch (e) {
          console.error(`❌ CMD ERROR ${file}:`, e.message);
        }
      }
    } else if (item.endsWith(".js")) {
      try {
        const cmd = require(itemPath);
        if (cmd?.data?.name) {
          client.commands.set(cmd.data.name, cmd);
          console.log(`✅ /${cmd.data.name}`);
          loaded++;
        }
      } catch (e) {
        console.error(`❌ CMD ERROR ${item}:`, e.message);
      }
    }
  }

  console.log(`📊 Commands loaded: ${loaded}`);
}

// ====================== EVENTS ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return console.warn("⚠️ events folder missing");

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  let loaded = 0;

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name || !event.execute) continue;

      const runner = (...args) => {
        try {
          event.execute(...args, client);
        } catch (err) {
          console.error(`❌ EVENT ERROR ${event.name}:`, err);
        }
      };

      if (event.once) client.once(event.name, runner);
      else client.on(event.name, runner);

      console.log(`✅ event: ${event.name}`);
      loaded++;
    } catch (e) {
      console.error(`❌ EVENT LOAD ERROR ${file}:`, e.message);
    }
  }

  console.log(`📊 Events loaded: ${loaded}`);
}

// ====================== SAFE SYSTEM LOADER ======================
async function loadSystems() {
  console.log("🚀 Loading systems...");

  try {
    const levelSystem = require("./utils/levelSystem");
    levelSystem.startVoiceXP(client);
  } catch (e) {
    console.error("❌ LevelSystem error:", e.message);
  }

  try {
    const { startDailyReset } = require("./utils/profileSystem");
    if (startDailyReset) startDailyReset();
  } catch (e) {
    console.error("❌ DailySystem error:", e.message);
  }

  try {
    const { startClanSystem } = require("./utils/clanSystem");
    if (startClanSystem) startClanSystem(client);
  } catch (e) {
    console.error("❌ ClanSystem error:", e.message);
  }

  try {
    const { loadCoins } = require("./utils/economySystem");
    const { loadBoosts } = require("./utils/boostSystem");
    loadCoins();
    loadBoosts();
  } catch (e) {
    console.error("❌ Economy/Boost error:", e.message);
  }

  // ticket system (IMPORTANT FIX)
  setTimeout(async () => {
    try {
      const { createTicketPanel } = require("./utils/ticketSystem");
      if (createTicketPanel) {
        await createTicketPanel(client);
        console.log("🎟 Ticket system ready");
      }
    } catch (e) {
      console.error("❌ Ticket system failed:", e.message);
    }
  }, 5000);
}

// ====================== READY ======================
client.once("ready", async () => {
  console.log("========================================");
  console.log(`🔥 Logged as ${client.user.tag}`);
  console.log(`📊 Guilds: ${client.guilds.cache.size}`);
  console.log("========================================");

  loadCommands();
  loadEvents();
  await loadSystems();

  console.log("✅ BOT FULLY READY");
});

// ====================== GLOBAL ERRORS ======================
process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ CRASH:", err);
});

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 Token OK"))
  .catch(err => {
    console.error("❌ LOGIN ERROR:", err.message);
    process.exit(1);
  });
