const { setConfig } = require("../utils/configSystem");

module.exports = {
  name: "config",
  description: "Ustawienia bota",

  options: [
    {
      name: "logs",
      type: 7, // CHANNEL
      description: "Ustaw kanał logów",
      required: false
    }
  ],

  async execute(interaction) {
    const channel = interaction.options.getChannel("logs");

    if (channel) {
      setConfig(interaction.guild.id, "logChannel", channel.id);

      return interaction.reply({
        content: `✅ Ustawiono kanał logów na ${channel}`,
        ephemeral: true
      });
    }
  }
};
