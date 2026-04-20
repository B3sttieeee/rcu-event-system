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
    
    // Funkcja do aktualizacji czasu natychmiast
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
    
    // Następne aktualizacje co minutę
    setInterval(async () => {
      await updateClock();
    }, 60 * 1000); // co minutę
    
    console.log("[CLOCK] Live clock uruchomiony pomyślnie");
  } catch (error) {
    console.error("❌ Błąd podczas uruchamiania live clock:", error.message);
  }
}

module.exports = { startLiveClock };
