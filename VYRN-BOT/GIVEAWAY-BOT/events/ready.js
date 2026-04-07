const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const { createTicketPanel } = require("../utils/ticketSystem");
const eventSystem = require("../utils/eventSystem");
const { loadGiveaways } = require("../utils/giveawaySystem");
const levelSystem = require("../utils/levelSystem");
const { startClanSystem } = require("../utils/clanSystem");

// 🔐 SAFE IMPORT
let startDailyReset = null;
try {
  ({ startDailyReset } = require("../utils/profileSystem"));
} catch (e) {
  console.log("⚠️ Profile system not loaded");
}

// ===== CONFIG =====
const GUILD_ID = "1475521240058953830";

// ===== LOGGER =====
function log(type, msg) {
  console.log(`${type} ${msg}`);
}

// ===== LOAD COMMANDS =====
async function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, "../commands");

  if (!fs.existsSync(commandsPath)) {
    log("⚠️", "Commands folder not found");
    return commands;
  }

  const folders = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    const stat = fs.statSync(folderPath);

    if (stat.isDirectory()) {
      // Podfoldery (economy, levels, giveaway itp.)
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
      for (const file of files) {
        try {
          delete require.cache[require.resolve(path.join(folderPath, file))];
          const cmd = require(path.join(folderPath, file));
          if (cmd?.data) {
            commands.push(cmd.data.toJSON());
          }
        } catch (err) {
          log("❌", `Command error (${folder}/${file})`);
          console.error(err);
        }
      }
    } 
    else if (stat.isFile() && folder.endsWith(".js")) {
      // Stare komendy bezpośrednio w commands/
      try {
        delete require.cache[require.resolve(path.join(commandsPath, folder))];
        const cmd = require(path.join(commandsPath, folder));
        if (cmd?.data) {
          commands.push(cmd.data.toJSON());
        }
      } catch (err) {
        log("❌", `Command error (${folder})`);
        console.error(err);
      }
    }
  }

  log("📦", `Loaded ${commands.length} commands`);
  return commands;
}

// ===== REGISTER COMMANDS =====
async function registerCommands(client, commands) {
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    log("✅", `Slash commands deployed (${commands.length})`);
  } catch (err) {
    log("❌", "Slash register error");
    console.error(err);
  }
}

// ===== INIT SYSTEMS =====
async function initSystems(client) {
  console.log("🚀 Uruchamianie systemów...");

  // 🎫 TICKETS
  try {
    await createTicketPanel(client);
    log("🎟", "Ticket system ready");
  } catch (err) {
    log("❌", "Ticket system failed");
    console.error(err);
  }

  // 🎮 EVENTS
  try {
    if (eventSystem) {
      await eventSystem.startPanel?.(client);
      await eventSystem.startEventSystem?.(client);
      log("✨", "Event system ready");
    }
  } catch (err) {
    log("❌", "Event system failed");
    console.error(err);
  }

  // 🎁 GIVEAWAYS
  try {
    await loadGiveaways(client);
    log("🎁", "Giveaways loaded");
  } catch (err) {
    log("❌", "Giveaways failed");
    console.error(err);
  }

  // 🎤 VOICE XP
  try {
    levelSystem?.startVoiceXP?.(client);
    log("🎤", "Voice XP ready");
  } catch (err) {
    log("❌", "Voice XP failed");
    console.error(err);
  }

  // 💰 ECONOMY + BOOST
  try {
    const { loadCoins } = require("../utils/economySystem");
    const { loadBoosts } = require("../utils/boostSystem");

    loadCoins();
    loadBoosts();

    log("💰", "Economy system ready");
    log("🚀", "Boost system ready");
  } catch (err) {
    log("❌", "Economy/Boost system failed");
    console.error(err);
  }

  // 🎯 DAILY RESET
  try {
    if (typeof startDailyReset === "function") {
      startDailyReset();
      log("🎯", "Daily system ready");
    }
  } catch (err) {
    log("❌", "Daily system failed");
    console.error(err);
  }

  // 🧠 CLAN SYSTEM
  try {
    if (typeof startClanSystem === "function") {
      startClanSystem(client);
      log("🧠", "Clan system ready");
    }
  } catch (err) {
    log("❌", "Clan system failed");
    console.error(err);
  }

  console.log("✅ Wszystkie systemy uruchomione pomyślnie.");
}

// ===== READY EVENT =====
module.exports = {
  name: "clientReady",        // ← Poprawione na clientReady (nowsza nazwa)
  once: true,
  async execute(client) {
    log("🔥", `${client.user.tag} logged in`);

    try {
      // 1️⃣ Ładowanie i rejestracja komend
      const commands = await loadCommands();
      await registerCommands(client, commands);

      // 2️⃣ Uruchomienie systemów
      await initSystems(client);

      log("🚀", "BOT FULLY INITIALIZED");
    } catch (err) {
      log("💀", "CRITICAL ERROR");
      console.error(err);
    }
  }
};
