// src/events/ready.js
const { Events } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log("================================");
    console.log(`🔥 VYRN BOT zalogowany jako: ${client.user.tag}`);
    console.log(`📊 Serwery: ${client.guilds.cache.size}`);
    console.log("================================");

    console.log("✅ Bot gotowy — wszystkie systemy załadowane modularnie.");
  }
};
