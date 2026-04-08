// ====================== MAIN EVENT SYSTEM (STABILNA WERSJA) ======================
function startEventSystem(client) {
  console.log("🚀 Event System uruchomiony – monitorowanie godzin...");

  // Mapa do śledzenia, czy dany event już został obsłużony w tej godzinie
  const processedEvents = new Map();

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // ====================== HONEY MERCHANT ======================
    for (const eventHour of CONFIG.MERCHANT_HOURS) {
      const eventKey = `merchant-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55) {
        if (!processedEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            await channel.send(`<@&${CONFIG.MERCHANT_ROLE}> ⏳ **Honey Merchant** za 5 minut!`).catch(() => {});
            processedEvents.set(eventKey + "-pre", true);
          }
        }
      }

      // Start eventu
      if (hour === eventHour && minute === 0) {
        if (!processedEvents.has(eventKey + "-started")) {
          // Usuń poprzedni ping "za 5 minut", jeśli istnieje
          const preKey = eventKey + "-pre";
          if (processedEvents.has(preKey)) {
            // Nie mamy obiektu wiadomości, więc nie usuwamy — ale przynajmniej nie spamujemy
            processedEvents.delete(preKey);
          }

          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const startMsg = await channel.send({
              content: `<@&${CONFIG.MERCHANT_ROLE}>`,
              embeds: [createMerchantStartEmbed()]
            }).catch(() => null);

            sendDMNotifications(client, "merchant");

            if (startMsg) {
              setTimeout(() => startMsg.delete().catch(() => {}), CONFIG.START_MESSAGE_DELETE_AFTER);
            }
          }

          processedEvents.set(eventKey + "-started", true);
        }
      }
    }

    // ====================== EGG HUNT ======================
    for (const eventHour of CONFIG.EGG_HOURS) {
      const eventKey = `egg-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55) {
        if (!processedEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            await channel.send(`<@&${CONFIG.EGG_ROLE}> ⏳ **Egg Hunt** za 5 minut!`).catch(() => {});
            processedEvents.set(eventKey + "-pre", true);
          }
        }
      }

      // Start eventu
      if (hour === eventHour && minute === 0) {
        if (!processedEvents.has(eventKey + "-started")) {
          const preKey = eventKey + "-pre";
          if (processedEvents.has(preKey)) processedEvents.delete(preKey);

          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            const startMsg = await channel.send({
              content: `<@&${CONFIG.EGG_ROLE}>`,
              embeds: [createEggStartEmbed()]
            }).catch(() => null);

            sendDMNotifications(client, "egg");

            if (startMsg) {
              setTimeout(() => startMsg.delete().catch(() => {}), CONFIG.START_MESSAGE_DELETE_AFTER);
            }
          }

          processedEvents.set(eventKey + "-started", true);
        }
      }
    }

    // Czyszczenie pamięci co godzinę
    if (minute === 5) {
      processedEvents.clear();
    }

  }, CONFIG.REFRESH_INTERVAL);
}
