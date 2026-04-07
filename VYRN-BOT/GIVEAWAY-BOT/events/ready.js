// ===== INIT SYSTEMS =====
async function initSystems(client) {
  console.log("🚀 Uruchamianie systemów...");

  // 🎫 TICKETS
  try {
    const { createTicketPanel } = require("../utils/ticketSystem");
    await createTicketPanel(client);
    log("🎟", "Ticket system ready");
  } catch (err) {
    log("❌", "Ticket system failed");
    console.error(err);
  }

  // 🎮 EVENTS
  try {
    if (eventSystem) {
      await eventSystem.startPanel?.(client);
      await eventSystem.startEventSystem?.(client);
      log("✨", "Event system ready");
    }
  } catch (err) {
    log("❌", "Event system failed");
    console.error(err);
  }

  // 🎁 GIVEAWAYS
  try {
    const { loadGiveaways } = require("../utils/giveawaySystem");
    await loadGiveaways(client);
    log("🎁", "Giveaways loaded");
  } catch (err) {
    log("❌", "Giveaways failed");
    console.error(err);
  }

  // 🎤 VOICE XP
  try {
    const levelSystem = require("../utils/levelSystem");
    levelSystem?.startVoiceXP?.(client);
    log("🎤", "Voice XP ready");
  } catch (err) {
    log("❌", "Voice XP failed");
    console.error(err);
  }

  // 💰 ECONOMY + BOOST
  try {
    const { loadCoins } = require("../utils/economySystem");
    const { loadBoosts } = require("../utils/boostSystem");

    loadCoins();
    loadBoosts();

    log("💰", "Economy system ready");
    log("🚀", "Boost system ready");
  } catch (err) {
    log("❌", "Economy/Boost system failed");
    console.error(err);
  }

  // 🎯 DAILY RESET
  try {
    const { startDailyReset } = require("../utils/profileSystem");
    if (typeof startDailyReset === "function") {
      startDailyReset();
      log("🎯", "Daily system ready");
    }
  } catch (err) {
    log("❌", "Daily system failed");
    console.error(err);
  }

  // 🧠 CLAN SYSTEM
  try {
    const { startClanSystem } = require("../utils/clanSystem");
    if (typeof startClanSystem === "function") {
      startClanSystem(client);
      log("🧠", "Clan system ready");
    }
  } catch (err) {
    log("❌", "Clan system failed");
    console.error(err);
  }

  console.log("✅ Wszystkie systemy uruchomione pomyślnie.");
}
