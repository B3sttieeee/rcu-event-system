const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

let giveaways = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create giveaway")
    .addStringOption(o =>
      o.setName("nagroda").setDescription("Nagroda").setRequired(true))
    .addIntegerOption(o =>
      o.setName("czas").setDescription("Minuty").setRequired(true))
    .addRoleOption(o =>
      o.setName("bonus").setDescription("Bonus role")),

  async execute(interaction) {
    const prize = interaction.options.getString("nagroda");
    const time = interaction.options.getInteger("czas");
    const bonusRole = interaction.options.getRole("bonus");

    const embed = new EmbedBuilder()
      .setColor("#ff6600")
      .setTitle("🎉 Giveaway")
      .setDescription(
        `🎁 ${prize}\n\nKliknij Join aby wziąć udział\n\n👥 0\n🏆 1\n⏳ ${time} min`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join")
        .setLabel("Join")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("leave")
        .setLabel("Leave")
        .setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    giveaways[msg.id] = {
      users: [],
      bonusRole,
      prize
    };

    setTimeout(() => {
      const data = giveaways[msg.id];
      if (!data || data.users.length === 0) return;

      const winner =
        data.users[Math.floor(Math.random() * data.users.length)];

      interaction.channel.send(`🏆 Winner: <@${winner}> (${prize})`);
    }, time * 60000);
  }
};
