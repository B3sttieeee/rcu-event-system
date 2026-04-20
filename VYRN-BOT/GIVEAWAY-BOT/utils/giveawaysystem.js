const fs = require("fs").promises;
const path = require("path");

// Przykładowe dane do testów
let giveaways = new Map();

async function loadGiveaways(client) {
  try {
    const dataDir = "./data";
    const filePath = path.join(dataDir, "giveaways.json");
    if (!fs.existsSync(dataDir)) await fs.mkdir(dataDir);
    
    let fileData;
    try {
      fileData = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch (err) {
      console.log("❌ No giveaways data found. Creating new data file.");
      fileData = {};
    }

    // Wczytaj wszystkie giveawayy
    for (const [id, data] of Object.entries(fileData)) {
      if (!data || !data.messageId || !data.channelId) continue;
      
      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      const message = await channel?.messages.fetch(data.messageId).catch(() => null);
      
      if (message && !giveaways.has(id)) {
        giveaways.set(id, data);
        // Możesz tutaj dodać dodatkowe akcje, np. restart timer
      }
    }

    console.log(`[GIVEAWAY] Wczytano ${giveaways.size} giveawayów`);
    return Object.fromEntries(giveaways);
  } catch (err) {
    console.error("❌ Błąd podczas ładowania giveawayów:", err.message);
    return {};
  }
}

// Przykładowa implementacja `handleGiveaway`
async function handleGiveaway(interaction) {
  try {
    const data = giveaways.get(interaction.message.id);
    if (!data || data.ended) {
      return interaction.reply({ content: "❌ Ten giveaway jest już zakończony.", ephemeral: true });
    }

    // Logika do obsługi przycisków (dozwolone/odmowa itp.)
    const userId = interaction.user.id;
    
    if (interaction.customId === "gw_join") {
      if (data.users.includes(userId)) return interaction.reply({ content: "✅ Już bierzesz udział!", ephemeral: true });
      
      data.users.push(userId);
      await saveGiveaways();
      await interaction.reply({ content: "🎟 Dołączyłeś do giveaway!", ephemeral: true });
    }
    
    if (interaction.customId === "gw_leave") {
      if (!data.users.includes(userId)) return interaction.reply({ content: "❌ Nie brałeś udziału.", ephemeral: true });
      
      data.users = data.users.filter(id => id !== userId);
      await saveGiveaways();
      await interaction.reply({ content: "❌ Wypisałeś się z giveaway.", ephemeral: true });
    }
    
    // Aktualizuj embed
    try {
      await interaction.message.edit({ embeds: [buildEmbed(data)] });
    } catch (err) {
      console.error("❌ Błąd edycji embedu:", err.message);
    }
  } catch (err) {
    console.error("❌ Błąd handlera giveawaya:", err.message);
    try {
      await interaction.reply({ content: "❌ Wystąpił błąd podczas obsługi przycisku.", ephemeral: true });
    } catch (replyErr) {
      console.error("❌ Błąd odpowiedzi na interakcję:", replyErr.message);
    }
  }
}

async function saveGiveaways() {
  try {
    const data = Object.fromEntries(giveaways);
    await fs.writeFile("./data/giveaways.json", JSON.stringify(data, null, 2));
    console.log("[GIVEAWAY] Zapisano giveawayy");
  } catch (err) {
    console.error("❌ Błąd zapisu giveawayów:", err.message);
  }
}

function buildEmbed(data) {
  return new EmbedBuilder()
    .setTitle(data.prize)
    .setDescription(`Uczestnicy: ${data.users.length} / ${data.winners}`)
    .addFields(
      { name: "⏳ Czas trwania", value: data.time },
      { name: "🏆 Zwycięzców", value: `${data.winners}` }
    )
    .setFooter({ text: `ID: ${data.id}` });
}

module.exports = { handleGiveaway, loadGiveaways };
