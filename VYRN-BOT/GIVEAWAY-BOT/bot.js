const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  Events
} = require("discord.js");
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const COMMANDS_DIR = path.join(ROOT_DIR, "commands");
const EVENTS_DIR = path.join(ROOT_DIR, "events");
const TICKET_PANEL_DELAY = 5000;

// =====================================================
// CLIENT
// =====================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();

// =====================================================
// HELPERS
// =====================================================
const logError = (label, error) => {
  console.error(`[ERROR] ${label}`);

  if (error?.stack) {
    console.error(error.stack);
    return;
  }

  console.error(error);
};

const getJsFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...getJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

const relativeFile = (filePath) => path.relative(ROOT_DIR, filePath);

// =====================================================
// RATE LIMIT / CLIENT ERRORS
// =====================================================
client.rest.on("rateLimited", (info) => {
  console.warn(
    `[RATE LIMIT] ${info.method} ${info.url} | retry in ${info.timeToReset}ms`
  );
});

client.on(Events.Warn, (info) => {
  console.warn(`[DISCORD WARN] ${info}`);
});

client.on(Events.Error, (error) => {
  logError("Discord client error", error);
});

// =====================================================
// LOAD COMMANDS
// =====================================================
const loadCommands = () => {
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.warn("[WARN] commands folder missing");
    return 0;
  }

  const files = getJsFiles(COMMANDS_DIR);
  let loaded = 0;

  for (const filePath of files) {
    try {
      delete require.cache[require.resolve(filePath)];

      const command = require(filePath);

      if (!command?.data?.name || typeof command.execute !== "function") {
        console.warn(
          `[SKIP] Invalid command export: ${relativeFile(filePath)}`
        );
        continue;
      }

      if (client.commands.has(command.data.name)) {
        console.warn(
          `[WARN] Duplicate command name "${command.data.name}" in ${relativeFile(filePath)}`
        );
      }

      client.commands.set(command.data.name, command);
      console.log(`[COMMAND] Loaded /${command.data.name} <- ${relativeFile(filePath)}`);
      loaded++;
    } catch (error) {
      logError(`Failed loading command: ${relativeFile(filePath)}`, error);
    }
  }

  console.log(`[COMMAND] Total loaded: ${loaded}`);
  return loaded;
};

// =====================================================
// LOAD EVENTS
// =====================================================
const loadEvents = () => {
  if (!fs.existsSync(EVENTS_DIR)) {
    console.warn("[WARN] events folder missing");
    return 0;
  }

  const files = getJsFiles(EVENTS_DIR);
  const loadedEvents = new Map();
  let loaded = 0;

  for (const filePath of files) {
    try {
      delete require.cache[require.resolve(filePath)];

      const event = require(filePath);

      if (!event?.name || typeof event.execute !== "function") {
        continue;
      }

      const eventFiles = loadedEvents.get(event.name) || [];
      eventFiles.push(relativeFile(filePath));
      loadedEvents.set(event.name, eventFiles);

      const runner = async (...args) => {
        try {
          await event.execute(...args, client);
        } catch (error) {
          logError(
            `Event "${event.name}" failed in ${relativeFile(filePath)}`,
            error
          );
        }
      };

      if (event.once) {
        client.once(event.name, runner);
      } else {
        client.on(event.name, runner);
      }

      console.log(`[EVENT] Loaded ${event.name} <- ${relativeFile(filePath)}`);
      loaded++;
    } catch (error) {
      logError(`Failed loading event: ${relativeFile(filePath)}`, error);
    }
  }

  for (const [eventName, filesForEvent] of loadedEvents.entries()) {
    if (filesForEvent.length > 1) {
      console.warn(`[WARN] Duplicate listeners for event "${eventName}":`);
      for (const file of filesForEvent) {
        console.warn(`  - ${file}`);
      }
    }
  }

  console.log(`[EVENT] Total loaded: ${loaded}`);
  return loaded;
};

// =====================================================
// SYSTEMS
// =====================================================
const loadSystems = async () => {
  console.log("[SYSTEM] Loading systems...");

  try {
    const levelSystem = require("./utils/levelSystem");

    if (typeof levelSystem.startVoiceXP === "function") {
      levelSystem.startVoiceXP(client);
      console.log("[SYSTEM] levelSystem loaded");
    }
  } catch (error) {
    logError("levelSystem", error);
  }

  try {
    const { startDailyReset } = require("./utils/profileSystem");

    if (typeof startDailyReset === "function") {
      startDailyReset();
      console.log("[SYSTEM] profileSystem loaded");
    }
  } catch (error) {
    logError("profileSystem", error);
  }

  try {
    const { startClanSystem } = require("./utils/clanSystem");

    if (typeof startClanSystem === "function") {
      startClanSystem(client);
      console.log("[SYSTEM] clanSystem loaded");
    }
  } catch (error) {
    logError("clanSystem", error);
  }

  try {
    const { loadCoins } = require("./utils/economySystem");
    const { loadBoosts } = require("./utils/boostSystem");

    if (typeof loadCoins === "function") {
      loadCoins();
    }

    if (typeof loadBoosts === "function") {
      loadBoosts();
    }

    console.log("[SYSTEM] economy/boost systems loaded");
  } catch (error) {
    logError("economy/boost systems", error);
  }

  setTimeout(async () => {
    try {
      const { createTicketPanel } = require("./utils/ticketSystem");

      if (typeof createTicketPanel === "function") {
        await createTicketPanel(client);
        console.log("[SYSTEM] ticketSystem loaded");
      }
    } catch (error) {
      logError("ticketSystem", error);
    }
  }, TICKET_PANEL_DELAY);

  console.log("[SYSTEM] Systems initialized");
};

// =====================================================
// READY
// =====================================================
client.once(Events.ClientReady, async (readyClient) => {
  console.log("================================");
  console.log(`[READY] Logged in as: ${readyClient.user.tag}`);
  console.log(`[READY] Guilds: ${readyClient.guilds.cache.size}`);
  console.log("================================");

  await loadSystems();

  console.log("[READY] BOT READY");
});

// =====================================================
// PROCESS ERRORS
// =====================================================
process.on("unhandledRejection", (reason) => {
  logError("Unhandled rejection", reason);
});

process.on("uncaughtException", (error) => {
  logError("Uncaught exception", error);
});

// =====================================================
// BOOTSTRAP
// =====================================================
const startBot = async () => {
  if (!process.env.TOKEN) {
    console.error("[FATAL] Missing TOKEN in .env");
    process.exit(1);
  }

  loadCommands();
  loadEvents();

  try {
    await client.login(process.env.TOKEN);
    console.log("[LOGIN] Success");
  } catch (error) {
    logError("Login failed", error);
    process.exit(1);
  }
};

startBot();
