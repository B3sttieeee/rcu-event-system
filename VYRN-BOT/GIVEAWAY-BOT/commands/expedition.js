const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const DB_PATH = "./expeditionDB.json";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== COMMAND =====
module.exports = {
  data: new SlashCommandBuilder()
    .setName("expedition")
    .setDescription("Ustaw ekspedycję dla swojego zwierzaka w Roblox")
    .addStringOption(option =>
      option.setName("czas")
        .setDescription("Wybierz czas ekspedycji")
        .setRequired(true)
        .addChoices(
          { name: "30 minut", value: "30" },
          { name: "1 godzina", value: "60" },
          { name: "4 godziny", value: "240" }
        )
    ),

  async execute(interaction) {
    const czas = parseInt(interaction.options.getString("czas"));
    const userId = interaction.user.id;
    const db = loadDB();

    const now = Date.now();
    const endTime = now + czas * 60 * 1000;

    db.users[userId] = { endTime };
    saveDB(db);

    interaction.reply({ content: `⏳ Ekspedycja ustawiona na ${czas} minut! Powiadomienie przyjdzie na DM po zakończeniu.`, ephemeral: true });
  }
};

// ===== TIMER SYSTEM =====
async function startExpeditionTimer(client) {
  setInterval(async () => {
    const db = loadDB();
    const now = Date.now();

    for (const userId in db.users) {
      const data = db.users[userId];
      if (now >= data.endTime) {
        const user = await client.users.fetch(userId).catch(()=>null);
        if (user) {
          user.send("✅ Twoja ekspedycja zakończona! Wejdź do gry, aby odebrać nagrodę i rozpocząć nową!").catch(()=>{});
        }
        delete db.users[userId];
      }
    }

    saveDB(db);
  }, 10 * 1000); // sprawdzanie co 10s
}

module.exports.startExpeditionTimer = startExpeditionTimer;
