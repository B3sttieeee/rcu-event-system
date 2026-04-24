// =====================================================
// VYRN BOT - COMMAND DEPLOYER (PRO VERSION FIXED)
// =====================================================

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  console.error("❌ Missing TOKEN in environment variables!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ Missing CLIENT_ID in environment variables!");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");

function loadCommandFiles(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      loadCommandFiles(itemPath);
      continue;
    }

    if (!item.endsWith(".js")) continue;

    try {
      // 🔥 FIX: zawsze czysty require (usuwa ghost cache problemów typu /top)
      delete require.cache[require.resolve(itemPath)];

      const command = require(itemPath);

      if (command?.data?.name && typeof command.execute === "function") {
        commands.push(command.data.toJSON());
        console.log(`📦 Loaded: /${command.data.name}`);
      } else {
        console.log(`⚠️ Skipped invalid command: ${item}`);
      }

    } catch (err) {
      // 🔥 FIX: nie zabija deploya jak jeden plik (np. /top) się wysypie
      console.error(`❌ Error loading ${item}:`, err.message);
    }
  }
}

if (!fs.existsSync(commandsPath)) {
  console.error("❌ Commands folder not found!");
  process.exit(1);
}

loadCommandFiles(commands);

if (commands.length === 0) {
  console.log("⚠️ No commands found to deploy.");
  process.exit(0);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("\n🚀 Starting deployment...");
    console.log(`📊 Total commands: ${commands.length}`);

    commands.forEach(c => console.log(`   → /${c.name}`));

    if (GUILD_ID) {
      console.log(`\n⚡ Deploying to GUILD: ${GUILD_ID}`);

      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );

      console.log("✅ Guild commands deployed instantly!");
    } else {
      console.log("\n🌍 Deploying GLOBAL commands (may take up to 1h)...");

      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );

      console.log("✅ Global commands deployed!");
    }

    console.log("🎉 Deployment finished successfully!\n");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
})();
