const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const { createTicketPanel } = require("../utils/ticketSystem");
const eventSystem = require("../utils/eventSystem");
const { loadGiveaways } = require("../utils/giveawaySystem");
const levelSystem = require("../utils/levelSystem");

// 🔐 SAFE IMPORT (żeby bot nie crashował)
let resetDaily = null;
try {
  ({ resetDaily } = require("../utils/profileSystem"));
} catch {
  console.log("⚠️ Profile system not loaded");
}

// ===== CONFIG =====
const GUILD_ID = "1475521240058953830"; // 🔥 WAŻNE

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

  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of files) {
    try {
      const cmd = require(`../commands/${file}`);

      if (cmd?.data) {
        commands.push(cmd.data.toJSON());
      }

    } catch (err) {
      log("❌", `Command error (${file})`);
      console.log(err);
    }
  }

  log("📦", `Loaded ${commands.length} commands`);
  return commands;
}

// ===== REGISTER COMMANDS =====
async function registerCommands(client, commands) {
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    // 🔥 GUILD COMMANDS = NATYCHMIAST DZIAŁA
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );

    log("✅", `Slash commands deployed instantly (${commands.length})`);

  } catch (err) {
    log("❌", "Slash register error");
    console.log(err);
  }
}

// ===== SYSTEMS =====
async function initSystems(client) {

  // 🎫 Ticket
  try {
    await createTicketPanel(client);
    log("🎟", "Ticket panel loaded");
  } catch (err) {
    log("❌", "Ticket error");
    console.log(err);
  }

  // 🎮 Event System
  try {
    if (eventSystem) {

      if (typeof eventSystem.startPanel === "function") {
        await eventSystem.startPanel(client);
      }

      if (typeof eventSystem.startEventSystem === "function") {
        await eventSystem.startEventSystem(client);
      }

      log("✨", "Event system started");
    }
  } catch (err) {
    log("❌", "Event system error");
    console.log(err);
  }

  // 🎁 Giveaways
  try {
    if (typeof loadGiveaways === "function") {
      await loadGiveaways(client);
      log("🎁", "Giveaways loaded");
    }
  } catch (err) {
    log("❌", "Giveaway error");
    console.log(err);
  }

  // 🎤 Voice XP
  try {
    if (levelSystem?.startVoiceXP) {
      levelSystem.startVoiceXP(client);
      log("🎤", "Voice XP started");
    }
  } catch (err) {
    log("❌", "Voice XP error");
    console.log(err);
  }

  // 🎯 DAILY RESET
  try {
    if (resetDaily) {
      resetDaily(); // 🔥 od razu przy starcie

      setInterval(() => {
        resetDaily();
        log("🔄", "Daily quests reset");
      }, 86400000);
    }
  } catch (err) {
    log("❌", "Daily reset error");
  }
}

// ===== READY EVENT =====
module.exports = {
  name: "clientReady",
  once: true,

  async execute(client) {
    log("🔥", `${client.user.tag} READY`);

    try {
      // 1️⃣ Load commands
      const commands = await loadCommands();

      // 2️⃣ Register slash (INSTANT)
      await registerCommands(client, commands);

      // 3️⃣ Start systems
      await initSystems(client);

      log("🚀", "BOT FULLY READY");

    } catch (err) {
      log("💀", "CRITICAL READY ERROR");
      console.log(err);
    }
  }
};
