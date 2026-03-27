const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const fs = require("fs");

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates // 🔥 VC XP (WAŻNE)
  ]
});

// ===== COMMANDS MAP =====
client.commands = new Collection();

// =========================
// 📦 LOAD COMMANDS (RAZ!)
// =========================
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);

    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
      console.log(`📦 Loaded command: ${command.data.name}`);
    } else {
      console.log(`⚠️ Invalid command file: ${file}`);
    }

  } catch (err) {
    console.log(`❌ Error loading command ${file}:`, err);
  }
}

// =========================
// ⚡ LOAD EVENTS
// =========================
const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
  try {
    const event = require(`./events/${file}`);

    if (!event.name || typeof event.execute !== "function") {
      console.log(`⚠️ Invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }

    console.log(`✅ Loaded event: ${event.name}`);

  } catch (err) {
    console.log(`❌ Error loading event ${file}:`, err);
  }
}

// =========================
// 🔥 READY LOG
// =========================
client.once("ready", () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

// =========================
// 🚀 LOGIN
// =========================
client.login(process.env.TOKEN);
