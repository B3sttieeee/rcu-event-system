const { Client, GatewayIntentBits, Collection, Partials } = require("discord.js");
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
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

client.commands = new Collection();

// ====================== RATE LIMIT ======================
client.rest.on("rateLimited", (info) => {
  console.warn(
    `[RATE LIMIT] ${info.method} ${info.url} — ${info.timeToReset}ms`
  );
});

// ====================== LOAD COMMANDS ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) {
    console.warn("⚠️ commands folder missing");
    return;
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
          console.log(`✅ /${cmd.data.name}`);
          loaded++;
        }
      } catch (e) {
        console.error("❌ CMD ERROR:", e.message);
      }
    };

    if (stat.isDirectory()) {
      fs.readdirSync(itemPath)
        .filter((f) => f.endsWith(".js"))
        .forEach((f) => loadFile(path.join(itemPath, f)));
    } else if (item.endsWith(".js")) {
      loadFile(itemPath);
    }
  }

  console.log(`📊 Commands loaded: ${loaded}`);
}

// ====================== LOAD EVENTS ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) {
    console.warn("⚠️ events folder missing");
    return;
  }

  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
  let loaded = 0;

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));

      if (!event?.name || !event?.execute) continue;

      const runner = (...args) => event.execute(...args, client);

      if (event.once) client.once(event.name, runner);
      else client.on(event.name, runner);

      console.log(`✅ event loaded: ${event.name}`);
      loaded++;
    } catch (e) {
      console.error("❌ EVENT ERROR:", e.message);
    }
  }

  console.log(`📊 Events loaded: ${loaded}`);
}

// ====================== SYSTEMS ======================
async function loadSystems() {
  console.log("🚀 Loading systems...");

  // LEVEL SYSTEM
  try {
    const levelSystem = require("./utils/levelSystem");
    levelSystem.startVoiceXP(client);
  } catch (e) {
    console.error("Level system error:", e.message);
  }

  // DAILY SYSTEM
  try {
    const { startDailyReset } = require("./utils/profileSystem");
    startDailyReset?.();
  } catch (e) {}

  // CLAN SYSTEM
  try {
    const { startClanSystem } = require("./utils/clanSystem");
    startClanSystem?.(client);
  } catch (e) {}

  // ECONOMY / BOOST
  try {
    const { loadCoins } = require("./utils/economySystem");
    const { loadBoosts } = require("./utils/boostSystem");

    loadCoins?.();
    loadBoosts?.();
  } catch (e) {}

  // TICKET PANEL
  setTimeout(async () => {
    try {
      const { createTicketPanel } = require("./utils/ticketSystem");
      await createTicketPanel(client);
      console.log("🎟 Ticket panel loaded");
    } catch (e) {
      console.error("Ticket system error:", e.message);
    }
  }, 5000);

  console.log("✅ Systems loaded");
}

// ====================== READY ======================
client.once("ready", async () => {
  console.log("================================");
  console.log(`🔥 Logged as: ${client.user.tag}`);
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
  .then(() => console.log("🔑 LOGIN SUCCESS"))
  .catch((err) => {
    console.error("❌ LOGIN ERROR:", err.message);
    process.exit(1);
  });
