const { ChannelType } = require("discord.js");
const CHANNEL_ID = "1494086652522397837";

// Pobierz liczbę użytkowników w kanale głosowym
function getUserCount(channel) {
  return channel.members.size;
}

// Formatuj nazwę kanału z licznikiem osób
function formatChannelName(count) {
  return `🔊-${count}`;
}

// Główne funkcje
async function startLiveClock(client) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel) {
      console.log("❌ Kanał nie został znaleziony");
      return;
    }

    console.log(`[DEBUG] Typ kanału: ${channel.type}`);
    console.log(`[DEBUG] Nazwa kanału: ${channel.name}`);

    // Sprawdź, czy to kanał głosowy
    if (channel.type !== ChannelType.GuildVoice) {
      console.log("❌ Kanał nie jest kanałem głosowym");
      return;
    }

    let lastCount = null;

    // Funkcja do aktualizacji licznika
    async function updateClock() {
      try {
        const currentCount = getUserCount(channel);
        const newName = formatChannelName(currentCount);

        if (newName === lastCount) return; // Nie aktualizuj, jeśli brak zmian

        await channel.setName(newName);
        lastCount = newName;
        console.log(`[COUNT] Zmieniono na ${newName}`);
      } catch (err) {
        console.error("❌ Error updating user count:", err.message);
      }
    }

    // Natychmiastowa aktualizacja
    await updateClock();

    // Aktualizuj co sekundę, ale tylko raz na minutę
    let lastUpdate = 0;
    setInterval(async () => {
      const now = Date.now();
      if (now - lastUpdate >= 60000) { // Co 60 sekund
        await updateClock();
        lastUpdate = now;
      }
    }, 1000); // Sprawdzaj co sekundę

    console.log("[COUNT] User counter uruchomiony pomyślnie");
  } catch (error) {
    console.error("❌ Błąd podczas uruchamiania licznika użytkowników:", error.message);
  }
}

module.exports = { startLiveClock };
