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
  if (error?.stack) console.error(error.stack);
  else console.error(error);
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
  } else {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    log("✅", `Global slash commands deployed (${commands.length})`);
  }
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

  // Giveaway
  try {
    if (giveawaySystem?.loadGiveaways) {
      await giveawaySystem.loadGiveaways(client);
      log("🎁", "Giveaways loaded");
    }
  } catch (error) {
    logError("giveawaySystem", error);
  }

  // Level + Voice XP
  try {
    if (levelSystem?.startVoiceXP) {
      levelSystem.startVoiceXP(client);
      log("🎤", "Level + Voice XP ready");
    }
  } catch (error) {
    logError("levelSystem", error);
  }

  // Clan System
  try {
    if (typeof clanSystem?.startClanSystem === "function") {
      clanSystem.startClanSystem(client);
      log("🧠", "Clan system ready");
    }
  } catch (error) {
    logError("clanSystem", error);
  }

  // Economy + Boosts
  try {
    if (economySystem?.loadCoins) economySystem.loadCoins();
    if (boostSystem?.loadBoosts) boostSystem.loadBoosts();
    log("💰", "Economy & Boosts ready");
  } catch (error) {
    logError("economy/boost", error);
  }

  // Profile System (bez Daily)
  try {
    if (profileSystem) {
      log("📁", "Profile system ready (without Daily Quest)");
    }
  } catch (error) {
    logError("profileSystem", error);
  }

  // Rules Panel
  try {
    const { createRulesPanel } = require("../utils/rulesPanel");
    await createRulesPanel(client);
    log("📜", "Rules panel ready");
  } catch (error) {
    logError("rulesPanel", error);
  }

  // Ticket Panel
  setTimeout(async () => {
    try {
      const { createTicketPanel } = require("../utils/ticketSystem");
      await createTicketPanel(client);
      log("🎟", "Ticket panel ready");
    } catch (error) {
      logError("ticketSystem", error);
    }
  }, TICKET_PANEL_DELAY);

  log("✅", "Core systems initialized (Daily Quest removed)");
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
