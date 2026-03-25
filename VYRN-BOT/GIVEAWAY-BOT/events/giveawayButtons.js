const giveaways = {};

module.exports = {
  name: "interactionCreate",

  async execute(interaction) {
    if (!interaction.isButton()) return;

    const data = giveaways[interaction.message.id];
    if (!data) return;

    if (interaction.customId === "join") {
      if (!data.users.includes(interaction.user.id)) {
        data.users.push(interaction.user.id);
      }
    }

    if (interaction.customId === "leave") {
      data.users = data.users.filter(u => u !== interaction.user.id);
    }

    interaction.reply({ content: "✅ Updated", ephemeral: true });
  }
};
