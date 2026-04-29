// =====================================================
// VYRN BOT • CORE ENGINE (PRESTIGE EDITION)
// =====================================================
const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

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

// ====================== SYSTEMS LOADER (DATA FIRST) ======================
/**
 * Inicjalizacja systemów plików MUSI nastąpić przed ładowaniem eventów,
 * aby dane (economy/levels) były dostępne od pierwszej milisekundy.
 */
async function loadSystems() {
  console.log("\n🚀 [VYRN HQ] Initializing Core Systems...");

  const systems = [
    "log",
    "economy",      // Economy first (Base)
    "boost",
    "activity",     // Activity (Needs Economy/Boost)
    "clan",
    "rules",
    "recruitment",  // <--- DODANY SYSTEM REKRUTACJI
    "event",
    "giveaway",
    "tickets",
    "privatevc",
    "voiceRewards"
  ];

  for (const sysName of systems) {
    try {
      const sysPath = path.join(__dirname, "systems", sysName);
      if (!fs.existsSync(sysPath)) continue;

      const sys = require(sysPath);
      if (typeof sys.init === "function") {
        const result = sys.init(client);
        if (result instanceof Promise) await result;
        console.log(`✅ ${sysName.padEnd(12)} → READY`);
      }
    } catch (e) {
      console.error(`❌ ${sysName.padEnd(12)} → CRITICAL STARTUP ERROR: ${e.message}`);
    }
  }
}

// ====================== COMMAND LOADER ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return;

  const items = fs.readdirSync(commandsPath);
  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    
    if (fs.statSync(itemPath).isDirectory()) {
      const subFiles = fs.readdirSync(itemPath).filter(f => f.endsWith(".js"));
      for (const file of subFiles) {
        const cmd = require(path.join(itemPath, file));
        if (cmd?.data?.name) client.commands.set(cmd.data.name, cmd);
      }
    } else if (item.endsWith(".js")) {
      const cmd = require(itemPath);
      if (cmd?.data?.name) client.commands.set(cmd.data.name, cmd);
    }
  }
  console.log(`⚔️ [COMMANDS] Loaded: ${client.commands.size}`);
}

// ====================== EVENT LOADER ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return;

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event?.name || typeof event.execute !== "function") continue;

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (e) {
      console.error(`❌ [EVENT ERROR] ${file}:`, e.message);
    }
  }
}

// ====================== READY EVENT (FIXED) ======================
// Zmieniono z 'ready' na Events.ClientReady aby usunąć DeprecationWarning
client.once(Events.ClientReady, async (c) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🔥 PRESTIGE BOT ONLINE: ${c.user.tag}`);
  console.log(`📊 OPERATING IN: ${c.guilds.cache.size} Servers`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Kolejność ma znaczenie: Najpierw dane, potem funkcje
  await loadSystems();
  loadCommands();
  loadEvents();

  console.log("\n✅ VYRN HQ SYSTEM FULLY OPERATIONAL");
});

// ====================== ERROR HANDLING ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`[RATE LIMIT] ⚠️ ${info.method} ${info.url} — Reset: ${info.timeToReset}ms`);
});

process.on("unhandledRejection", (err) => console.error("❌ Global Reject:", err));
process.on("uncaughtException", (err) => console.error("❌ Global Exception:", err));

// ====================== LOGIN ======================
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 [AUTH] Secure connection established."))
  .catch(err => {
    console.error("❌ [AUTH ERROR]:", err.message);
    process.exit(1);
  });
