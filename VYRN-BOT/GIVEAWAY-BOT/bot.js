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
// CLIENT / PROCESS ERRORS
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

process.on("unhandledRejection", (reason) => {
  logError("Unhandled rejection", reason);
});

process.on("uncaughtException", (error) => {
  logError("Uncaught exception", error);
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
        console.warn(`[SKIP] Invalid command export: ${relativeFile(filePath)}`);
        continue;
      }

      if (client.commands.has(command.data.name)) {
        console.warn(
          `[WARN] Command "${command.data.name}" already exists. Overwriting with ${relativeFile(filePath)}`
        );
      }

      client.commands.set(command.data.name, command);
      console.log(`[COMMAND] /${command.data.name} <- ${relativeFile(filePath)}`);
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
  const handlersCount = new Map();
  let loaded = 0;

  for (const filePath of files) {
    try {
      delete require.cache[require.resolve(filePath)];

      const event = require(filePath);

      if (!event?.name || typeof event.execute !== "function") {
        console.warn(`[SKIP] Invalid event export: ${relativeFile(filePath)}`);
        continue;
      }

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

      handlersCount.set(event.name, (handlersCount.get(event.name) || 0) + 1);

      console.log(`[EVENT] ${event.name} <- ${relativeFile(filePath)}`);
      loaded++;
    } catch (error) {
      logError(`Failed loading event: ${relativeFile(filePath)}`, error);
    }
  }

  for (const [eventName, count] of handlersCount.entries()) {
    if (count > 1) {
      console.log(`[EVENT] ${eventName} has ${count} handlers attached`);
    }
  }

  console.log(`[EVENT] Total loaded: ${loaded}`);
  return loaded;
};

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
