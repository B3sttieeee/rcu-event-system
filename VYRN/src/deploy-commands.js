// =====================================================
// DEPLOY COMMANDS - VYRN BOT
// =====================================================
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || "1475521240058953830"; // Twój serwer domyślny

if (!TOKEN) {
  console.error("❌ Brak TOKEN w zmiennych środowiskowych!");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");

// Zbieranie wszystkich komend (w tym z podfolderów)
function loadCommandFiles(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      loadCommandFiles(itemPath); // rekurencja dla podfolderów
    } else if (item.endsWith(".js")) {
      try {
        const command = require(itemPath);
        if (command?.data?.name && typeof command.execute === "function") {
          commands.push(command.data.toJSON());
          console.log(`📤 Found command: /${command.data.name}`);
        }
      } catch (error) {
        console.error(`❌ Błąd ładowania komendy ${item}:`, error.message);
      }
    }
  }
}

// Uruchomienie zbierania komend
if (fs.existsSync(commandsPath)) {
  loadCommandFiles(commandsPath);
} else {
  console.warn("⚠️ Folder 'commands' nie istnieje! Nic nie zostanie zdeployowane.");
}

if (commands.length === 0) {
  console.log("⚠️ Nie znaleziono żadnych komend do zdeployowania.");
  process.exit(0);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🚀 Deployuję ${commands.length} komend...`);

    if (GUILD_ID) {
      // Deploy tylko na konkretny serwer (szybko, do testów)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID || "TWÓJ_CLIENT_ID", GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Pomyślnie zdeployowano ${commands.length} komend na serwer (GUILD_ID: ${GUILD_ID})`);
    } else {
      // Deploy globalny (trwa do 1h)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID || "TWÓJ_CLIENT_ID"),
        { body: commands }
      );
      console.log(`✅ Pomyślnie zdeployowano ${commands.length} komend GLOBALNIE`);
    }
  } catch (error) {
    console.error("❌ Błąd podczas deployu komend:", error);
  }
})();
