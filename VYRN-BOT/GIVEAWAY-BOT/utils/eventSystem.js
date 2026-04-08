// ====================== MAIN EVENT SYSTEM (POPRAWIONY - ANTI-SPAM) ======================
function startEventSystem(client) {
  console.log("🚀 Event System uruchomiony – monitorowanie godzin...");

  // Klucz: "merchant-14" lub "egg-12"
  const triggeredEvents = new Map();

  setInterval(async () => {
    const now = getNow();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // ====================== HONEY MERCHANT ======================
    for (const eventHour of CONFIG.MERCHANT_HOURS) {
      const eventKey = `merchant-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55) {
        if (!triggeredEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            await channel.send(`<@&${CONFIG.MERCHANT_ROLE}> ⏳ **Honey Merchant** za 5 minut!`).catch(() => {});
            triggeredEvents.set(eventKey + "-pre", true);
          }
        }
      }

      // Start eventu (tylko raz!)
      if (hour === eventHour && minute === 0) {
        if (!triggeredEvents.has(eventKey + "-started")) {
          // Usuń ping sprzed 5 minut
          const preKey = eventKey + "-pre";
          const preMsg = triggeredEvents.get(preKey); // jeśli trzymasz obiekt wiadomości
          // Jeśli masz obiekt wiadomości, możesz go usunąć:
          // if (preMsg && preMsg.delete) preMsg.delete().catch(() => {});

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

          triggeredEvents.set(eventKey + "-started", true);
        }
      }
    }

    // ====================== EGG HUNT ======================
    for (const eventHour of CONFIG.EGG_HOURS) {
      const eventKey = `egg-${eventHour}`;

      // 5 minut przed
      if (hour === eventHour - 1 && minute === 55) {
        if (!triggeredEvents.has(eventKey + "-pre")) {
          const channel = await client.channels.fetch(CONFIG.CHANNEL_ID).catch(() => null);
          if (channel) {
            await channel.send(`<@&${CONFIG.EGG_ROLE}> ⏳ **Egg Hunt** za 5 minut!`).catch(() => {});
            triggeredEvents.set(eventKey + "-pre", true);
          }
        }
      }

      // Start eventu
      if (hour === eventHour && minute === 0) {
        if (!triggeredEvents.has(eventKey + "-started")) {
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
          triggeredEvents.set(eventKey + "-started", true);
        }
      }
    }

    // Czyszczenie pamięci co godzinę (żeby nie rosła w nieskończoność)
    if (minute === 5) {
      triggeredEvents.clear();
    }

  }, CONFIG.REFRESH_INTERVAL);
}
