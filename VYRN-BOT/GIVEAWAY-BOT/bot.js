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

// ====================== LOAD COMMANDS ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return console.warn("⚠️ commands missing");

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
          console.log(`✅ /${cmd.data.name}`);
          loaded++;
        }
      } catch (e) {
        console.error("CMD ERROR:", e.message);
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

  console.log(`📊 Commands: ${loaded}`);
}

// ====================== LOAD EVENTS ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return console.warn("⚠️ events missing");

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  let loaded = 0;

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event?.name || !event?.execute) continue;

      const runner = (...args) => event.execute(...args, client);

      if (event.once) client.once(event.name, runner);
      else client.on(event.name, runner);

      console.log(`✅ event: ${event.name}`);
      loaded++;
    } catch (e) {
      console.error("EVENT ERROR:", e.message);
    }
  }

  console.log(`📊 Events: ${loaded}`);
}

// ====================== SYSTEMS ======================
async function loadSystems() {
  console.log("🚀 Loading systems...");

  try {
    const levelSystem = require("./utils/levelSystem");
    levelSystem.startVoiceXP(client);
  } catch (e) {
    console.error("Level error:", e.message);
  }

  try {
    const { startDailyReset } = require("./utils/profileSystem");
    startDailyReset?.();
  } catch (e) {}

  try {
    const { startClanSystem } = require("./utils/clanSystem");
    startClanSystem?.(client);
  } catch (e) {}

  try {
    const { loadCoins } = require("./utils/economySystem");
    const { loadBoosts } = require("./utils/boostSystem");
    loadCoins?.();
    loadBoosts?.();
  } catch (e) {}

  // ticket panel
  setTimeout(async () => {
    try {
      const { createTicketPanel } = require("./utils/ticketSystem");
      await createTicketPanel(client);
      console.log("🎟 Ticket panel ready");
    } catch (e) {
      console.error("Ticket error:", e.message);
    }
  }, 5000);

  // 🕒 VOICE CLOCK START
  try {
    const voiceClock = require("./utils/voiceClock");
    voiceClock.start(client);
    console.log("🕒 Voice clock started");
  } catch (e) {
    console.error("Clock error:", e.message);
  }
}

// ====================== READY ======================
client.once("ready", async () => {
  console.log("================================");
  console.log(`🔥 Logged: ${client.user.tag}`);
  console.log(`📊 Guilds: ${client.guilds.cache.size}`);
  console.log("================================");

  loadCommands();
  loadEvents();
  await loadSystems();

  console.log("✅ BOT READY");
});

// ====================== ERRORS ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 LOGIN OK"))
  .catch(err => {
    console.error("LOGIN ERROR:", err.message);
    process.exit(1);
  });
