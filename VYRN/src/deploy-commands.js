const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing env variables!");
  process.exit(1);
}

const commands = [];

// 🔥 FIX PATH
const commandsPath = path.join(process.cwd(), "src", "commands");

function loadCommandFiles(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);

    if (fs.statSync(itemPath).isDirectory()) {
      loadCommandFiles(itemPath);
      continue;
    }

    if (!item.endsWith(".js")) continue;

    try {
      delete require.cache[require.resolve(itemPath)];
      const command = require(itemPath);

      if (command?.data?.name && typeof command.execute === "function") {
        commands.push(command.data.toJSON());
        console.log(`📦 Loaded: /${command.data.name}`);
      } else {
        console.log(`⚠️ Invalid: ${item}`);
      }
    } catch (err) {
      console.error(`❌ ${item}:`, err.message);
    }
  }
}

if (!fs.existsSync(commandsPath)) {
  console.error("❌ Commands folder not found:", commandsPath);
  process.exit(1);
}

loadCommandFiles(commands);

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("\n🚀 Deploying commands...");
    console.log("📁 Path:", commandsPath);
    console.log(`📊 Total: ${commands.length}`);

    await rest.put(
      GUILD_ID
        ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
        : Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Deploy finished!");
  } catch (e) {
    console.error("❌ Deploy error:", e);
  }
})();
