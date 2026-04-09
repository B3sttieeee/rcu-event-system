const fs = require("fs");
const path = require("path");

const DATA_DIR = "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");

let activeBoosts = new Map(); // userId => { multiplier, endTime, name, type: "shop" }

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

// ====================== CORE ======================
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

  // Nadpisujemy poprzedni boost (nawet jeśli był aktywny)
  activeBoosts.set(member.id, {
    multiplier: boost.multiplier,
    endTime,
    name: boost.name,
    type: "shop"
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
  } catch (e) {
    // DM zablokowane - ignorujemy
  }

  return { success: true, boost };
}

module.exports = {
  loadBoosts,
  getCurrentBoost,
  buyBoost,
  SHOP_BOOSTS,
  activeBoosts, // tylko do debugowania
};
