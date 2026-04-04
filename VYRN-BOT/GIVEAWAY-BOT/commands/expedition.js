const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const DB_PATH = "./expeditionDB.json";

// ===== DB =====
function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== PANEL =====
async function sendExpeditionPanel(interaction) {
  const embed = new EmbedBuilder()
    .setColor("#00ff99")
    .setTitle("🚀 Ekspedycja dla Twojego zwierzaka")
    .setDescription("Wybierz czas ekspedycji dla swojego zwierzaka. Po zakończeniu otrzymasz DM!")
    .setImage("https://i.imgur.com/3tVZK6b.png"); // przykładowy obrazek

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("expedition_time_select")
      .setPlaceholder("Wybierz czas ekspedycji")
      .addOptions([
        { label: "30 minut", value: "30", description: "Krótka ekspedycja", emoji: "⏱️" },
        { label: "1 godzina", value: "60", description: "Średnia ekspedycja", emoji: "🕐" },
        { label: "4 godziny", value: "240", description: "Długa ekspedycja", emoji: "🕓" }
      ])
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ===== HANDLE PICKER =====
async function handleExpeditionSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "expedition_time_select") return;

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

// ===== TIMER SYSTEM =====
async function startExpeditionTimer(client) {
  setInterval(async () => {
    const db = loadDB();
    const now = Date.now();

    for (const userId in db.users) {
      const data = db.users[userId];
      if (now >= data.endTime) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          user.send("✅ Twoja ekspedycja zakończona! Wejdź do gry, aby odebrać nagrodę i rozpocząć nową!").catch(() => {});
        }
        delete db.users[userId];
      }
    }

    saveDB(db);
  }, 10000);
}

// ===== EXPORTS =====
module.exports = {
  sendExpeditionPanel,
  handleExpeditionSelect,
  startExpeditionTimer
};
