const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
console.error("❌ Missing TOKEN / CLIENT_ID / GUILD_ID");
process.exit(1);
}

const commands = [];

const commandsPath = path.join(process.cwd(), "src", "commands");

function loadCommands(dir) {
const items = fs.readdirSync(dir);

for (const item of items) {
const fullPath = path.join(dir, item);

if (fs.statSync(fullPath).isDirectory()) {
loadCommands(fullPath);
continue;
}

if (!item.endsWith(".js")) continue;

try {
delete require.cache[require.resolve(fullPath)];
const cmd = require(fullPath);

if (cmd?.data?.toJSON && typeof cmd.execute === "function") {
commands.push(cmd.data.toJSON());
console.log(`📦 Loaded /${cmd.data.name}`);
} else {
console.log(`⚠️ Invalid command: ${item}`);
}
} catch (err) {
console.error(`❌ Error loading ${item}:`, err.message);
}
}
}

if (!fs.existsSync(commandsPath)) {
console.error("❌ Commands folder not found:", commandsPath);
process.exit(1);
}

loadCommands(commandsPath);

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
try {
console.log("\n🚀 STARTING DEPLOY...");
console.log(`📁 Path: ${commandsPath}`);
console.log(`📊 Commands: ${commands.length}`);

// 🔥 HARD RESET CACHE (usuwa stare slashy)
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: [] }
);

console.log("🧹 Cleared old commands");

// 🔥 DEPLOY NEW
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);

console.log("✅ DEPLOY SUCCESS");
console.log("📌 Commands active immediately in guild");

} catch (err) {
console.error("❌ DEPLOY FAILED:", err);
}
})();
