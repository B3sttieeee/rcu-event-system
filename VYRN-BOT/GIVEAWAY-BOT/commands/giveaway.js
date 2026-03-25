const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const ms = require("ms");
const giveaways = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Start giveaway")
    .addStringOption(o => o.setName("time").setRequired(true))
    .addStringOption(o => o.setName("reward").setRequired(true))
    .addIntegerOption(o => o.setName("winners").setRequired(true)),

  async execute(interaction) {

    const time = interaction.options.getString("time");
    const reward = interaction.options.getString("reward");
    const winners = interaction.options.getInteger("winners");

    const duration = ms(time);
    if (!duration) return interaction.reply({ content: "❌ Bad time", ephemeral: true });

    const data = {
      reward,
      winners,
      participants: [],
      end: Date.now() + duration
    };

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎉 GIVEAWAY")
      .setDescription(`🎁 **${reward}**\nKliknij 🎉`)
      .addFields(
        { name: "👥", value: "0", inline: true },
        { name: "🏆", value: `${winners}`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("gw_join")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

    giveaways.set(msg.id, data);

    setTimeout(() => end(msg), duration);

    interaction.reply({ content: "✅ Started", ephemeral: true });
  }
};

function end(msg) {
  const data = giveaways.get(msg.id);
  if (!data) return;

  if (!data.participants.length) {
    msg.channel.send("❌ No participants");
    return;
  }

  const winner = data.participants[Math.floor(Math.random() * data.participants.length)];
  msg.channel.send(`🎉 Winner: <@${winner}>`);
}
