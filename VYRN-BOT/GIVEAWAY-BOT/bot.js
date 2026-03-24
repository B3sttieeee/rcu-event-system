js
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');

console.log("🚀 START BOT");

// client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo connected"))
  .catch(err => console.log("❌ Mongo error:", err));

// load events
const eventFiles = fs.readdirSync('./events');

for (const file of eventFiles) {
  const event = require(`./events/${file}`);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// anti crash
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(process.env.TOKEN);
