const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const { createTicketPanel } = require("../utils/ticketSystem");
const eventSystem = require("../utils/eventSystem");

// 🔥 POPRAWKA
const { loadGiveawaysToMemory, resumeGiveaway } = require("../utils/giveawaySystem");

const levelSystem = require("../utils/levelSystem");

// 🔐 SAFE IMPORT
let startDailyReset = null;
try {
  ({ startDailyReset } = require("../utils/profileSystem"));
} catch {
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

  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of files) {
    try {
      delete require.cache[require.resolve(`../commands/${file}`)];

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

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );

    log("✅", `Slash commands deployed (${commands.length})`);

  } catch (err) {
    log("❌", "Slash register error");
    console.log(err);
  }
}

// ===== INIT SYSTEMS =====
async function initSystems(client) {

  // 🎫 TICKETS
  try {
    await createTicketPanel(client);
    log("🎟", "Ticket system ready");
  } catch (err) {
    log("❌", "Ticket system failed");
    console.log(err);
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
    console.log(err);
  }

  // 🎁 GIVEAWAYS (🔥 NAJWAŻNIEJSZE)
  try {
    // 1️⃣ LOAD DO MAPY
    loadGiveawaysToMemory();

    // 2️⃣ AUTO RESUME WSZYSTKICH
    const data = fs.existsSync("/data/giveaways.json")
      ? JSON.parse(fs.readFileSync("/data/giveaways.json"))
      : {};

    for (const id in data) {
      await resumeGiveaway(client, id);
    }

    log("♻️", `Resumed ${Object.keys(data).length} giveaways`);

  } catch (err) {
    log("❌", "Giveaways failed");
    console.log(err);
  }

  // 🎤 VOICE XP
  try {
    levelSystem?.startVoiceXP?.(client);
    log("🎤", "Voice XP ready");
  } catch (err) {
    log("❌", "Voice XP failed");
    console.log(err);
  }

  // 🎯 DAILY RESET (🔥 POPRAWKA)
  try {
    if (startDailyReset) {
      startDailyReset();
      log("🎯", "Daily system ready");
    }
  } catch (err) {
    log("❌", "Daily system failed");
    console.log(err);
  }
}

// ===== READY EVENT =====
module.exports = {
  name: "clientReady",
  once: true,

  async execute(client) {
    log("🔥", `${client.user.tag} logged in`);

    try {
      // 1️⃣ COMMANDS
      const commands = await loadCommands();

      // 2️⃣ REGISTER
      await registerCommands(client, commands);

      // 3️⃣ SYSTEMY
      await initSystems(client);

      log("🚀", "BOT FULLY INITIALIZED");

    } catch (err) {
      log("💀", "CRITICAL ERROR");
      console.log(err);
    }
  }
};
