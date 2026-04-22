// src/events/interactionCreate.js
const interactionRouter = require("../handlers/interactionRouter");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.guild) return;
    await interactionRouter(interaction);
  }
};
