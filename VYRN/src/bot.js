// =====================================================
// VYRN BOT • CORE ENGINE (PRESTIGE EDITION)
// =====================================================
const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// --- TERMINAL COLORS ---
const c = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m"
};

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
async function loadSystems() {
  console.log(`\n${c.cyan}🚀 [VYRN HQ] Initializing Core Systems...${c.reset}`);

  // DODANO: cardgenerator na końcu listy
  const systems = [
    "log",
    "economy",      // Economy first (Base)
    "boost",
    "activity",     // Activity (Needs Economy/Boost)
    "clan",
    "rules",
    "recruitment",  // Recruitment System
    "event",
    "giveaway",
    "tickets",
    "privatevc",
    "voiceRewards",
    "cardgenerator" // <--- NASZ NOWY SYSTEM GRAFICZNY
  ];

  for (const sysName of systems) {
    try {
      const sysPath = path.join(__dirname, "systems", sysName);
      // Obsługa zarówno folderu z index.js jak i pojedynczego pliku .js
      const isDir = fs.existsSync(sysPath) && fs.statSync(sysPath).isDirectory();
      const isFile = fs.existsSync(`${sysPath}.js`);

      if (!isDir && !isFile) {
        console.log(`${c.yellow}⚠️ ${sysName.padEnd(14)} → SKIPPED (File not found)${c.reset}`);
        continue;
      }

      const sys = require(sysPath);
      if (typeof sys.init === "function") {
        const result = sys.init(client);
        if (result instanceof Promise) await result;
        console.log(`${c.green}✅ ${sysName.padEnd(14)} → READY${c.reset}`);
      } else {
        // Moduły takie jak cardgenerator mogą nie mieć funkcji init(), tylko same helpery
        console.log(`${c.green}✅ ${sysName.padEnd(14)} → LOADED (Passive)${c.reset}`);
      }
    } catch (e) {
      console.error(`${c.red}❌ ${sysName.padEnd(14)} → CRITICAL ERROR: ${e.message}${c.reset}`);
    }
  }
}

// ====================== COMMAND LOADER ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return;

  let cmdCount = 0;
  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    
    if (fs.statSync(itemPath).isDirectory()) {
      const subFiles = fs.readdirSync(itemPath).filter(f => f.endsWith(".js"));
      for (const file of subFiles) {
        const cmd = require(path.join(itemPath, file));
        if (cmd?.data?.name) {
          client.commands.set(cmd.data.name, cmd);
          cmdCount++;
        }
      }
    } else if (item.endsWith(".js")) {
      const cmd = require(itemPath);
      if (cmd?.data?.name) {
        client.commands.set(cmd.data.name, cmd);
        cmdCount++;
      }
    }
  }
  console.log(`${c.magenta}⚔️  [COMMANDS] Loaded ${cmdCount} interactions into memory.${c.reset}`);
}

// ====================== EVENT LOADER ======================
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return;

  let eventCount = 0;
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
      eventCount++;
    } catch (e) {
      console.error(`${c.red}❌ [EVENT ERROR] ${file}: ${e.message}${c.reset}`);
    }
  }
  console.log(`${c.magenta}📡 [EVENTS] Registered ${eventCount} listeners.${c.reset}`);
}

// ====================== READY EVENT ======================
client.once(Events.ClientReady, async (cClient) => {
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.green}🔥 PRESTIGE BOT ONLINE: ${cClient.user.tag}${c.reset}`);
  console.log(`${c.yellow}📊 OPERATING IN: ${cClient.guilds.cache.size} Servers${c.reset}`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);

  // Systemy ładują się dopiero, gdy klient ma nawiązane połączenie
  await loadSystems();

  console.log(`\n${c.green}✅ [SYSTEM] VYRN HQ ENGINE FULLY OPERATIONAL${c.reset}\n`);
});

// ====================== ERROR HANDLING ======================
client.rest.on("rateLimited", (info) => {
  console.warn(`${c.yellow}[RATE LIMIT] ⚠️ ${info.method} ${info.url} — Reset in ${info.timeToReset}ms${c.reset}`);
});

process.on("unhandledRejection", (err) => {
  console.error(`${c.red}❌ [CRITICAL] Unhandled Rejection:${c.reset}`, err);
});
process.on("uncaughtException", (err) => {
  console.error(`${c.red}❌ [CRITICAL] Uncaught Exception:${c.reset}`, err);
});

// ====================== BOOTSTRAP SEQUENCE ======================
// WAŻNE: Komendy i Eventy ładujemy do pamięci PRZED logowaniem!
console.log(`${c.cyan}Booting up VYRN Engine...${c.reset}`);
loadCommands();
loadEvents();

// Ostatni krok: Logowanie do Discord API
client.login(process.env.TOKEN)
  .then(() => console.log(`${c.green}🔑 [AUTH] Secure connection established with Discord.${c.reset}`))
  .catch(err => {
    console.error(`${c.red}❌ [AUTH ERROR]: ${err.message}${c.reset}`);
    process.exit(1);
  });
