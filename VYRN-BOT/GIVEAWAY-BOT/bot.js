const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const fs = require("fs");

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // 🔥 REQUIRED FOR WELCOME
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== LOAD EVENTS =====
const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
  try {
    const event = require(`./events/${file}`);

    if (!event.name) {
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

// ===== READY LOG =====
client.once("ready", () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
