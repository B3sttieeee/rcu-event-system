require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

// ====================== ENV CHECK ======================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional

if (!TOKEN) {
  console.error("❌ Missing TOKEN in .env");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ Missing CLIENT_ID in .env");
  process.exit(1);
}

// ====================== LOAD COMMANDS ======================
const commands = [];
const commandsPath = path.join(__dirname, "commands");

function loadCommands(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      loadCommands(itemPath);
      continue;
    }

    if (!item.endsWith(".js")) continue;

    try {
      const command = require(itemPath);

      if (command?.data?.name && typeof command.execute === "function") {
        commands.push(command.data.toJSON());
        console.log(`📦 Loaded: /${command.data.name}`);
      }
    } catch (err) {
      console.error(`❌ Error loading ${item}:`, err.message);
    }
  }
}

if (!fs.existsSync(commandsPath)) {
  console.error("❌ Commands folder not found!");
  process.exit(1);
}

loadCommands(commandsPath);

// ====================== VALIDATION ======================
if (commands.length === 0) {
  console.warn("⚠️ No commands found to deploy.");
  process.exit(0);
}

// ====================== REST CLIENT ======================
const rest = new REST({ version: "10" }).setToken(TOKEN);

// ====================== DEPLOY ======================
(async () => {
  try {
    console.log(`\n🚀 Deploying ${commands.length} commands...`);

    let route;

    if (GUILD_ID) {
      route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
      console.log(`📡 Mode: GUILD (${GUILD_ID})`);
    } else {
      route = Routes.applicationCommands(CLIENT_ID);
      console.log(`🌍 Mode: GLOBAL (can take up to 1h)`);
    }

    const response = await rest.put(route, {
      body: commands,
    });

    console.log(`\n✅ SUCCESS`);
    console.log(`📊 Deployed: ${response.length} commands`);
  } catch (error) {
    console.error("\n❌ DEPLOY FAILED");
    console.error(error?.rawError || error);
  }
})();
