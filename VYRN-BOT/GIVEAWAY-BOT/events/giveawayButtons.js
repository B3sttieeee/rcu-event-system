const giveaways = new Map();

module.exports = {
  async execute(interaction) {

    if (interaction.customId !== "gw_join") return;

    const data = giveaways.get(interaction.message.id);
    if (!data) return;

    if (!data.participants.includes(interaction.user.id)) {
      data.participants.push(interaction.user.id);
      interaction.reply({ content: "🎉 Joined!", ephemeral: true });
    } else {
      interaction.reply({ content: "❌ Already joined", ephemeral: true });
    }
  }
};
