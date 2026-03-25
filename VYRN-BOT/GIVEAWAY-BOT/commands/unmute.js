const { SlashCommandBuilder } = require("discord.js");

const MUTE_ROLE = "1476000458240819301";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute user")
    .addUserOption(o => o.setName("user").setRequired(true)),

  async execute(interaction) {

    const user = interaction.options.getMember("user");

    await user.roles.remove(MUTE_ROLE);

    interaction.reply(`✅ Unmuted ${user}`);
  }
};
