js
require('dotenv').config();

const fs = require('fs');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');

console.log("🚀 STARTING BOT...");

// ===== ENV CHECK =====
if (!process.env.TOKEN) {
  console.log("❌ ERROR: TOKEN not found");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.log("❌ ERROR: MONGO_URI not found");
  process.exit(1);
}

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== MONGO =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.log("❌ MongoDB ERROR:", err);
    process.exit(1);
  });

// ===== LOAD EVENTS =====
try {
  const eventFiles = fs.readdirSync('./events');

  console.log("📂 EVENTS:", eventFiles);

  for (const file of eventFiles) {
    console.log(`➡️ Loading event: ${file}`);

    const event = require(`./events/${file}`);

    if (!event.name || !event.execute) {
      console.log(`❌ Invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

} catch (err) {
  console.log("❌ ERROR LOADING EVENTS:", err);
}

// ===== LOGIN =====
client.login(process.env.TOKEN)
  .then(() => console.log("✅ Logged in"))
  .catch(err => {
    console.log("❌ LOGIN ERROR:", err);
  });

// ===== ANTI CRASH =====
process.on("unhandledRejection", err => {
  console.log("❌ UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", err => {
  console.log("❌ UNCAUGHT EXCEPTION:", err);
});
