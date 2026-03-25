const ticketSystem = require("./ticketSystem");
const fs = require("fs");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    try {

      // ===== TICKET SYSTEM =====
      if (
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        if (ticketSystem && typeof ticketSystem.handle === "function") {
          await ticketSystem.handle(interaction, client);
        }
      }

      // ===== SLASH COMMANDS =====
      if (!interaction.isChatInputCommand()) return;

      const commandFiles = fs.readdirSync("./commands");
      const commands = new Map();

      for (const file of commandFiles) {
        const cmd = require(`../commands/${file}`);
        commands.set(cmd.data.name, cmd);
      }

      const command = commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);

    } catch (err) {
      console.log("❌ INTERACTION ERROR:", err);

      if (interaction.replied || interaction.deferred) {
        interaction.followUp({
          content: "❌ Error occurred",
          ephemeral: true
        }).catch(() => {});
      } else {
        interaction.reply({
          content: "❌ Error occurred",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
