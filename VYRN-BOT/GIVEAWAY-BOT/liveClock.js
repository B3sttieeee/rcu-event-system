const { ChannelType } = require("discord.js");
const CHANNEL_ID = "1494086652522397837";

// format PL time (Warsaw)
function getWarsawTime() {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

// clean name for Discord channel
function formatChannelName(time) {
  return `🕒-${time.replace(":", "-")}`;
}

// main loop
async function startLiveClock(client) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    
    if (!channel) {
      console.log("❌ Kanał nie został znaleziony");
      return;
    }
    
    console.log(`[DEBUG] Typ kanału: ${channel.type}`);
    console.log(`[DEBUG] Nazwa kanału: ${channel.name}`);
    
    // Sprawdź czy to kanał głosowy lub tekstowy
    const validChannelTypes = [
      ChannelType.GuildVoice,
      ChannelType.GuildText
    ];
    
    if (!validChannelTypes.includes(channel.type)) {
      console.log("❌ Kanał nie jest ani głosowy, ani tekstowy");
      return;
    }
    
    let lastName = null;
    
    // Funkcja do aktualizacji czasu
    async function updateClock() {
      try {
        const time = getWarsawTime();
        const newName = formatChannelName(time);
        
        // nie spamujemy API jeśli nazwa taka sama
        if (newName === lastName) return;
        
        await channel.setName(newName);
        lastName = newName;
        console.log(`[CLOCK] Zmieniono na ${newName}`);
      } catch (err) {
        console.error("❌ Clock error:", err.message);
      }
    }
    
    // Natychmiastowa aktualizacja
    await updateClock();
    
    // Aktualizacja co sekundę, ale z kontrolą, żeby nie spamować API
    let lastUpdate = 0;
    setInterval(async () => {
      const now = Date.now();
      if (now - lastUpdate >= 60000) { // Co 60 sekund
        await updateClock();
        lastUpdate = now;
      }
    }, 1000); // Sprawdzaj co sekundę
    
    console.log("[CLOCK] Live clock uruchomiony pomyślnie");
  } catch (error) {
    console.error("❌ Błąd podczas uruchamiania live clock:", error.message);
  }
}

module.exports = { startLiveClock };
