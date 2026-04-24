// src/deploy-commands.js
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Brak TOKEN, CLIENT_ID lub GUILD_ID w zmiennych!");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");

console.log(`📁 Szukam komend w: ${commandsPath}`);

// Ładowanie komend
function loadCommandFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandFiles(fullPath);
      continue;
    }

    if (!item.endsWith(".js")) continue;

    try {
      delete require.cache[require.resolve(fullPath)]; // odświeżenie cache
      const cmd = require(fullPath);

      if (cmd?.data?.name && typeof cmd.execute === "function") {
        commands.push(cmd.data.toJSON());
        console.log(`✅ Loaded: /${cmd.data.name}`);
      }
    } catch (err) {
      console.error(`❌ Błąd ładowania ${item}:`, err.message);
    }
  }
}

loadCommandFiles(commandsPath);

if (commands.length === 0) {
  console.error("❌ Nie znaleziono żadnych komend!");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log(`\n🚀 Deployuję ${commands.length} komend na serwer...`);

    // Deploy na konkretny serwer (najpewniejsze)
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ DEPLOY ZAKOŃCZONY POMYŚLNIE");
    console.log("📌 Komendy powinny być widoczne w ciągu 1-2 minut");
  } catch (error) {
    console.error("❌ BŁĄD DEPLOYU:", error);
  }
})();
