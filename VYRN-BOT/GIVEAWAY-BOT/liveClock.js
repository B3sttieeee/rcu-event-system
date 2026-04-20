const { ChannelType } = require("discord.js");

// Przykładowe ID kanału, który ma pokazywać licznik uczestników
const CHANNEL_ID = "1494086652522397837";

function formatUserCount(count) {
  return `👥-${count}`;
}

async function startLiveClock(client) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    
    if (!channel) {
      console.log("❌ Kanał nie został znaleziony");
      return;
    }

    // Sprawdź, czy to kanał tekstowy lub głosowy
    if (![ChannelType.GuildText, ChannelType.GuildVoice].includes(channel.type)) {
      console.log("❌ Kanał musi być typu tekstowego lub głosowego");
      return;
    }
    
    let lastCount = 0;

    async function updateClock() {
      try {
        // Pobierz dane o uczestnikach (np. z `giveawaysystem.js`)
        const count = await getUserCount(channel, client);
        if (count === lastCount) return;
        
        await channel.setName(formatUserCount(count));
        lastCount = count;
      } catch (err) {
        console.error("❌ Błąd podczas aktualizacji licznika:", err.message);
      }
    }

    // Natychmiastowe uaktualnienie
    await updateClock();

    // Aktualizacja co 10 sekund
    setInterval(updateClock, 10000);

    console.log("[CLOCK] Live clock uruchomiony pomyślnie");
  } catch (error) {
    console.error("❌ Błąd podczas uruchamiania live clock:", error.message);
  }
}

// Przykładowa funkcja do pobierania liczby uczestników
async function getUserCount(channel, client) {
  try {
    const giveaways = await loadGiveaways(client); // Implementacja w `giveawaysystem.js`
    let totalUsers = 0;

    for (const giveaway of Object.values(giveaways)) {
      if (Array.isArray(giveaway.users)) {
        totalUsers += giveaway.users.length;
      }
    }

    return totalUsers;
  } catch (err) {
    console.error("❌ Błąd podczas liczenia uczestników:", err.message);
    return 0;
  }
}

module.exports = { startLiveClock };
