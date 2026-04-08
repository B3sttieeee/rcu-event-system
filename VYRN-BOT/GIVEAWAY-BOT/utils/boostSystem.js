const fs = require("fs");
const path = require("path");

const DATA_DIR = "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");

let activeBoosts = new Map(); // userId => { multiplier, endTime, name, type: "lucky" | "shop" }

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadBoosts() {
  if (!fs.existsSync(BOOST_PATH)) {
    fs.writeFileSync(BOOST_PATH, JSON.stringify({}, null, 2));
    console.log("[BOOST] Utworzono nowy plik activeBoosts.json");
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(BOOST_PATH, "utf-8"));
    activeBoosts = new Map(Object.entries(data));
    console.log(`[BOOST] Załadowano ${activeBoosts.size} aktywnych boostów`);
  } catch (err) {
    console.error("[BOOST] Błąd odczytu activeBoosts.json:", err.message);
    activeBoosts = new Map();
  }
}

function saveBoosts() {
  try {
    const data = Object.fromEntries(activeBoosts);
    fs.writeFileSync(BOOST_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[BOOST] Błąd zapisu activeBoosts.json:", err.message);
  }
}

function cleanExpiredBoosts() {
  const now = Date.now();
  for (const [userId, boost] of activeBoosts.entries()) {
    if (boost.endTime < now) {
      activeBoosts.delete(userId);
    }
  }
}

function getCurrentBoost(userId) {
  cleanExpiredBoosts();
  const boost = activeBoosts.get(userId);
  return boost ? boost.multiplier : 1;
}

// ====================== LUCKY BOOST (losowy z wiadomości) ======================
async function tryGiveRandomBoost(member) {
  if (!member || member.user.bot) return false;

  // 8% szansy na lucky boost
  if (Math.random() > 0.08) return false;

  // Nie dajemy lucky boosta, jeśli użytkownik ma już kupiony boost ze sklepu
  if (activeBoosts.has(member.id)) {
    const existing = activeBoosts.get(member.id);
    if (existing.type === "shop") {
      return false; // Szanujemy droższy boost kupiony przez użytkownika
    }
  }

  const boostsPool = [
    { multiplier: 1.5, duration: 15 * 60 * 1000, name: "1.5x XP" },
    { multiplier: 2.0, duration: 10 * 60 * 1000, name: "2x XP" },
    { multiplier: 2.5, duration: 7 * 60 * 1000, name: "2.5x XP" },
  ];

  const chosen = boostsPool[Math.floor(Math.random() * boostsPool.length)];
  const endTime = Date.now() + chosen.duration;

  activeBoosts.set(member.id, {
    multiplier: chosen.multiplier,
    endTime,
    name: chosen.name,
    type: "lucky"                    // oznaczamy jako losowy
  });

  saveBoosts();

  const embed = {
    color: 0x00ff88,
    title: "🎉 LUCKY BOOST!",
    description: `Otrzymałeś **${chosen.name}** na **${Math.floor(chosen.duration / 60000)} minut**!`,
    footer: { text: "Grinduj szybciej! 🔥" },
  };

  try {
    await member.send({ embeds: [embed] });
  } catch (e) {}

  return true;
}

// ====================== SKLEP Z BOOSTAMI ======================
const SHOP_BOOSTS = [
  { id: 1, name: "1.5x XP", multiplier: 1.5, duration: 25 * 60 * 1000, price: 180 },
  { id: 2, name: "2.0x XP", multiplier: 2.0, duration: 18 * 60 * 1000, price: 350 },
  { id: 3, name: "2.5x XP", multiplier: 2.5, duration: 12 * 60 * 1000, price: 550 },
  { id: 4, name: "3.0x XP", multiplier: 3.0, duration: 8 * 60 * 1000,  price: 950 },
];

async function buyBoost(member, boostId) {
  const boost = SHOP_BOOSTS.find(b => b.id === boostId);
  if (!boost) {
    return { success: false, message: "❌ Nie znaleziono takiego boostu!" };
  }

  const economy = require("./economySystem");
  if (!economy.spendCoins(member.id, boost.price)) {
    return {
      success: false,
      message: `❌ Nie masz wystarczająco monet! Potrzebujesz **${boost.price}** <:CASHH:1491180511308157041>`
    };
  }

  const endTime = Date.now() + boost.duration;

  // Kupiony boost ZAWSZE nadpisuje poprzedni (nawet lucky)
  activeBoosts.set(member.id, {
    multiplier: boost.multiplier,
    endTime,
    name: boost.name,
    type: "shop"                     // oznaczamy jako kupiony ze sklepu
  });

  saveBoosts();

  const embed = {
    color: 0x00ff88,
    title: "✅ Boost zakupiony pomyślnie!",
    description: `**${boost.name}** na **${Math.floor(boost.duration / 60000)} minut**!\n\n` +
                 `Zużyto: **${boost.price}** <:CASHH:1491180511308157041>`,
    footer: { text: "Grinduj szybciej! 🔥" },
  };

  try {
    await member.send({ embeds: [embed] });
  } catch (e) {}

  return { success: true, boost };
}

module.exports = {
  loadBoosts,
  getCurrentBoost,
  tryGiveRandomBoost,
  buyBoost,
  SHOP_BOOSTS,
  activeBoosts, // tylko do debugowania
};
