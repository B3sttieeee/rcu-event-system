const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const DB_PATH = "./expeditionDB.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== PANEL EMBED + PICKER =====
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

// ===== HANDLER SELECT MENU =====
async function handleExpeditionSelect(interaction) {
  const czas = parseInt(interaction.values[0]);
  const userId = interaction.user.id;
  const db = loadDB();

  const now = Date.now();
  const endTime = now + czas * 60 * 1000;

  db.users[userId] = { endTime };
  saveDB(db);

  await interaction.update({
    content: `⏳ Ekspedycja ustawiona na ${czas} minut! Powiadomienie przyjdzie na DM po zakończeniu.`,
    components: [],
    embeds: []
  });
}

// ===== SLASH COMMAND =====
module.exports = {
  data: new SlashCommandBuilder()
    .setName("expedition")
    .setDescription("Ustaw ekspedycję dla swojego zwierzaka w Roblox"),

  async execute(interaction) {
    await sendExpeditionPanel(interaction);
  },

  sendExpeditionPanel,
  handleExpeditionSelect
};
