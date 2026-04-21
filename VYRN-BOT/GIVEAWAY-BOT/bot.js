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

  console.log(`📊 Załadowano ${loaded} komend`);
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
      if (!event?.name || !event?.execute) continue;

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
  console.log("🚀 Ładowanie systemów...");

  // Giveaway System
  try {
    const giveawaySystem = require("./utils/giveawaySystem");
    giveawaySystem.loadGiveaways(client);
    console.log("🎁 Giveaway system załadowany");
  } catch (e) {
    console.error("❌ GiveawaySystem error:", e.message);
  }

  // Level System
  try {
    const levelSystem = require("./utils/levelSystem");
    levelSystem.startVoiceXP?.(client);
    console.log("📈 Level system załadowany");
  } catch (e) {
    console.error("LevelSystem error:", e.message);
  }

  // Daily System
  try {
    const { startDailyReset } = require("./utils/profileSystem");
    startDailyReset?.();
    console.log("📅 Daily system załadowany");
  } catch (e) {
    console.error("DailySystem error:", e.message);
  }

  // Clan System
  try {
    const { startClanSystem } = require("./utils/clanSystem");
    startClanSystem?.(client);
    console.log("🏴 Clan system załadowany");
  } catch (e) {
    console.error("ClanSystem error:", e.message);
  }

  // Economy + Boosts
  try {
    const { loadCoins } = require("./utils/economySystem");
    const { loadBoosts } = require("./utils/boostSystem");
    loadCoins?.();
    loadBoosts?.();
    console.log("💰 Economy & Boosts załadowane");
  } catch (e) {
    console.error("EconomySystem error:", e.message);
  }

  // Rules Panel
  try {
    const { createRulesPanel } = require("./utils/rulesPanel");
    await createRulesPanel(client);
    console.log("📜 Rules panel gotowy");
  } catch (e) {
    console.error("RulesPanel error:", e.message);
  }

  // Ticket Panel
  setTimeout(async () => {
    try {
      const { createTicketPanel } = require("./utils/ticketSystem");
      await createTicketPanel(client);
      console.log("🎟 Ticket panel gotowy");
    } catch (e) {
      console.error("TicketSystem error:", e.message);
    }
  }, 5000);

  // Voice Clock
  try {
    const voiceClock = require("./utils/voiceClock");
    voiceClock.start?.(client);
    console.log("🕒 Voice clock started");
  } catch (e) {
    console.error("VoiceClock error:", e.message);
  }
}

// ====================== READY EVENT ======================
client.once("ready", async () => {
  console.log("================================");
  console.log(`🔥 Bot zalogowany jako: ${client.user.tag}`);
  console.log(`📊 Serwery: ${client.guilds.cache.size}`);
  console.log("================================");

  loadCommands();
  loadEvents();
  await loadSystems();

  console.log("✅ BOT GOTOWY DO DZIAŁANIA");
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
