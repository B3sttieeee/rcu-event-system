const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");

// Pamięć tymczasowa ekspedycji
const expeditions = new Map();

function startExpedition(userId, minutes) {
  const endTime = Date.now() + minutes * 60 * 1000;
  expeditions.set(userId, endTime);
  return endTime;
}

async function handleExpeditionSelect(interaction) {
  const minutes = parseInt(interaction.values[0]);
  const userId = interaction.user.id;

  startExpedition(userId, minutes);

  await interaction.update({
    content: `⏳ Ekspedycja ustawiona na ${minutes} minut! Powiadomienie przyjdzie na DM po zakończeniu.`,
    components: [],
    embeds: []
  });

  setTimeout(async () => {
    try {
      const user = await interaction.client.users.fetch(userId);
      user.send(`✅ Twoja ekspedycja ${minutes} minut zakończona! 🐾`);
    } catch (err) {
      console.error("Nie udało się wysłać DM:", err);
    }
  }, minutes * 60 * 1000);
}

async function sendExpeditionPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🐾 Pet Adventures")
    .setDescription("Wybierz czas ekspedycji dla swojego zwierzaka:")
    .setColor("#ffcc00")
    .setImage("https://i.imgur.com/6pvEODD.png");

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("expedition_time_select")
      .setPlaceholder("Wybierz czas ekspedycji")
      .addOptions([
        { label: "15 Min", value: "15" },
        { label: "1 Hour", value: "60" },
        { label: "4 Hours", value: "240" },
        { label: "12 Hours", value: "720" }
      ])
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("expedition")
    .setDescription("Ustaw ekspedycję dla swojego zwierzaka"),

  async execute(interaction) {
    await sendExpeditionPanel(interaction);
  },

  handleExpeditionSelect
};
