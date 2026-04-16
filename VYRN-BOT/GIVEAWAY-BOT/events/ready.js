const { Events, REST, Routes } = require("discord.js");

const GUILD_ID = process.env.GUILD_ID || "1475521240058953830";
const TICKET_PANEL_DELAY = 5000;

// =====================================================
// HELPERS
// =====================================================
const log = (tag, message) => {
  console.log(`[READY] ${tag} ${message}`);
};

const logError = (scope, error) => {
  console.error(`[READY] ${scope}`);

  if (error?.stack) {
    console.error(error.stack);
    return;
  }

  console.error(error);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeRequire = (modulePath) => {
  try {
    return require(modulePath);
  } catch (error) {
    return null;
  }
};

// =====================================================
// REGISTER SLASH COMMANDS
// =====================================================
const registerCommands = async (client) => {
  const commands = [...client.commands.values()]
    .filter((command) => command?.data && typeof command.execute === "function")
    .map((command) => command.data.toJSON());

  if (!commands.length) {
    log("⚠️", "No slash commands found to register");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  if (GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );

    log("✅", `Guild slash commands deployed (${commands.length})`);
    return;
  }

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  log("✅", `Global slash commands deployed (${commands.length})`);
};

// =====================================================
// INIT SYSTEMS
// =====================================================
const initSystems = async (client) => {
  log("🚀", "Initializing systems...");

  const ticketSystem = safeRequire("../utils/ticketSystem");
  const eventSystem = safeRequire("../utils/eventSystem");
  const giveawaySystem = safeRequire("../utils/giveawaySystem");
  const levelSystem = safeRequire("../utils/levelSystem");
  const clanSystem = safeRequire("../utils/clanSystem");
  const profileSystem = safeRequire("../utils/profileSystem");
  const economySystem = safeRequire("../utils/economySystem");
  const boostSystem = safeRequire("../utils/boostSystem");

  try {
    if (eventSystem) {
      await eventSystem.startPanel?.(client);
      await eventSystem.startEventSystem?.(client);
      log("✨", "Event system ready");
    } else {
      log("⚠️", "eventSystem not found");
    }
  } catch (error) {
    logError("eventSystem failed", error);
  }

  try {
    if (giveawaySystem?.loadGiveaways) {
      await giveawaySystem.loadGiveaways(client);
      log("🎁", "Giveaways loaded");
    } else {
      log("⚠️", "giveawaySystem not found");
    }
  } catch (error) {
    logError("giveawaySystem failed", error);
  }

  try {
    if (levelSystem?.startVoiceXP) {
      levelSystem.startVoiceXP(client);
      log("🎤", "Voice XP ready");
    } else {
      log("⚠️", "levelSystem not found");
    }
  } catch (error) {
    logError("levelSystem failed", error);
  }

  try {
    if (economySystem?.loadCoins) {
      economySystem.loadCoins();
      log("💰", "Economy system ready");
    } else {
      log("⚠️", "economySystem not found");
    }

    if (boostSystem?.loadBoosts) {
      boostSystem.loadBoosts();
      log("🚀", "Boost system ready");
    } else {
      log("⚠️", "boostSystem not found");
    }
  } catch (error) {
    logError("economy/boost systems failed", error);
  }

  try {
    if (typeof profileSystem?.startDailyReset === "function") {
      profileSystem.startDailyReset();
      log("🎯", "Daily system ready");
    } else {
      log("⚠️", "profileSystem not found or startDailyReset missing");
    }
  } catch (error) {
    logError("profileSystem failed", error);
  }

  try {
    if (typeof clanSystem?.startClanSystem === "function") {
      clanSystem.startClanSystem(client);
      log("🧠", "Clan system ready");
    } else {
      log("⚠️", "clanSystem not found");
    }
  } catch (error) {
    logError("clanSystem failed", error);
  }

  setTimeout(async () => {
    try {
      if (typeof ticketSystem?.createTicketPanel === "function") {
        await ticketSystem.createTicketPanel(client);
        log("🎟", "Ticket system ready");
      } else {
        log("⚠️", "ticketSystem not found");
      }
    } catch (error) {
      logError("ticketSystem failed", error);
    }
  }, TICKET_PANEL_DELAY);

  log("✅", "Core systems initialized");
};

// =====================================================
// READY EVENT
// =====================================================
module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    log("🔥", `${client.user.tag} logged in`);
    log("📊", `Guilds: ${client.guilds.cache.size}`);

    try {
      await registerCommands(client);
      await sleep(1000);
      await initSystems(client);

      log("🚀", "BOT FULLY INITIALIZED");
    } catch (error) {
      logError("Critical startup error", error);
    }
  }
};
