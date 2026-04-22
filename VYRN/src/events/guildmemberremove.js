// src/events/guildmemberremove.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    try {
      // Możesz tu dodać log wyjścia jeśli chcesz (na razie prosty)
      console.log(`[LEAVE] ${member.user.tag} (${member.id}) left the server`);
    } catch (err) {
      console.error("[LEAVE] Error:", err);
    }
  }
};
