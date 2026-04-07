// ===== INIT SYSTEMS =====
async function initSystems(client) {
  // 🎫 TICKETS
  try {
    await createTicketPanel(client);
    log("🎟", "Ticket system ready");
  } catch (err) {
    log("❌", "Ticket system failed");
    console.log(err);
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
    console.log(err);
  }

  // 🎁 GIVEAWAYS
  try {
    await loadGiveaways(client);
    log("🎁", "Giveaways loaded");
  } catch (err) {
    log("❌", "Giveaways failed");
    console.log(err);
  }

  // 🎤 VOICE XP
  try {
    levelSystem?.startVoiceXP?.(client);
    log("🎤", "Voice XP ready");
  } catch (err) {
    log("❌", "Voice XP failed");
    console.log(err);
  }

  // 💰 ECONOMY + BOOST SYSTEM (NOWE)
  try {
    const { loadCoins } = require("../utils/economySystem");
    const { loadBoosts } = require("../utils/boostSystem");

    loadCoins();
    loadBoosts();

    log("💰", "Economy system ready");
    log("🚀", "Boost system ready");
  } catch (err) {
    log("❌", "Economy/Boost system failed");
    console.log(err);
  }

  // 🎯 DAILY RESET
  try {
    if (startDailyReset) {
      startDailyReset();
      log("🎯", "Daily system ready");
    }
  } catch (err) {
    log("❌", "Daily system failed");
  }

  // 🧠 CLAN SYSTEM
  try {
    startClanSystem(client);
    log("🧠", "Clan system ready");
  } catch (err) {
    log("❌", "Clan system failed");
    console.log(err);
  }
}
