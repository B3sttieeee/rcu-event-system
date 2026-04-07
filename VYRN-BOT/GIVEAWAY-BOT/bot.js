// ====================== ŁADOWANIE KOMEND (z podfolderami) ======================
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) {
    console.warn("⚠️ Folder 'commands' nie istnieje!");
    return;
  }

  let loaded = 0;

  const items = fs.readdirSync(commandsPath);

  for (const item of items) {
    const itemPath = path.join(commandsPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Ładowanie komend z podfolderu (np. levels/, economy/, giveaway/)
      const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith(".js"));

      for (const file of commandFiles) {
        try {
          const command = require(path.join(itemPath, file));
          if (command?.data?.name && typeof command.execute === "function") {
            client.commands.set(command.data.name, command);
            console.log(`✅ Załadowano komendę: /${command.data.name} (z ${item}/)`);
            loaded++;
          } else {
            console.warn(`⚠️ Nieprawidłowa struktura komendy: ${item}/${file}`);
          }
        } catch (err) {
          console.error(`❌ Błąd ładowania komendy ${item}/${file}:`, err.message);
        }
      }
    } 
    else if (stat.isFile() && item.endsWith(".js")) {
      // Ładowanie starych komend bezpośrednio z folderu commands/
      try {
        const command = require(itemPath);
        if (command?.data?.name && typeof command.execute === "function") {
          client.commands.set(command.data.name, command);
          console.log(`✅ Załadowano komendę: /${command.data.name}`);
          loaded++;
        }
      } catch (err) {
        console.error(`❌ Błąd ładowania komendy ${item}:`, err.message);
      }
    }
  }

  console.log(`📊 Załadowano łącznie ${loaded} komend slash.`);
}
