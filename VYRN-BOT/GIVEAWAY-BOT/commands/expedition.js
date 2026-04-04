// commands/expedition.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");

// Temporary in-memory storage for expeditions
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
    content: `⏳ Expedition set for **${minutes} minutes**! You will get a DM when it's finished.`,
    components: [],
    embeds: []
  });

  setTimeout(async () => {
    try {
      const user = await interaction.client.users.fetch(userId);
      user.send(`✅ Your **${minutes}-minute expedition** is completed! 🐾`);
    } catch (err) {
      console.error("Failed to send DM:", err);
    }
  }, minutes * 60 * 1000);
}

async function sendExpeditionPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🐾 Pet Adventures")
    .setDescription("Select the duration of your pet's expedition:")
    .setColor("#ffcc00")
    .setImage("https://i.imgur.com/6pvEODD.png");

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("expedition_time_select")
      .setPlaceholder("Choose expedition duration")
      .addOptions([
        { label: "15 Minutes", value: "15" },
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
    .setDescription("Set an expedition for your pet"),

  async execute(interaction) {
    await sendExpeditionPanel(interaction);
  },

  handleExpeditionSelect
};
