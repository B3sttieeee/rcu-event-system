// =====================================================
// BOOST SYSTEM - BLACK EDITION PRO
// =====================================================

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");

// ====================== CACHE ======================
let activeBoosts = new Map();

// ====================== INIT STORAGE ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== LOAD ======================
function loadBoosts() {
  if (!fs.existsSync(BOOST_PATH)) {
    fs.writeFileSync(BOOST_PATH, JSON.stringify({}, null, 2));
    console.log("🖤 BOOST → created new file");
    return;
  }

  try {
    const raw = fs.readFileSync(BOOST_PATH, "utf8");
    const data = JSON.parse(raw || "{}");

    activeBoosts = new Map(Object.entries(data));

    console.log(`🔥 BOOST → loaded ${activeBoosts.size} boosts`);
  } catch (err) {
    console.error("❌ BOOST LOAD ERROR:", err.message);
    activeBoosts = new Map();
  }
}

// ====================== SAVE (SAFE WRITE) ======================
function saveBoosts() {
  try {
    const data = Object.fromEntries(activeBoosts);
    fs.writeFileSync(BOOST_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ BOOST SAVE ERROR:", err.message);
  }
}

// ====================== CLEANER ======================
function cleanExpired() {
  const now = Date.now();

  for (const [userId, boost] of activeBoosts.entries()) {
    if (!boost?.endTime || boost.endTime <= now) {
      activeBoosts.delete(userId);
    }
  }
}

// ====================== GET BOOST ======================
function getCurrentBoost(userId) {
  cleanExpired();

  const boost = activeBoosts.get(userId);

  if (!boost) return 1;
  if (boost.endTime < Date.now()) return 1;

  return boost.multiplier || 1;
}

// ====================== SHOP ======================
const SHOP_BOOSTS = [
  { id: "1", name: "1.5x XP", multiplier: 1.5, duration: 25 * 60 * 1000, price: 180 },
  { id: "2", name: "2.0x XP", multiplier: 2.0, duration: 18 * 60 * 1000, price: 350 },
  { id: "3", name: "2.5x XP", multiplier: 2.5, duration: 12 * 60 * 1000, price: 550 },
  { id: "4", name: "3.0x XP", multiplier: 3.0, duration: 8 * 60 * 1000, price: 950 }
];

// ====================== BUY BOOST (SAFE + BLACK STYLE) ======================
async function buyBoost(member, boostId) {
  try {
    const boost = SHOP_BOOSTS.find(b => b.id === String(boostId));

    if (!boost) {
      return {
        success: false,
        message: "❌ Boost not found."
      };
    }

    const economy = require("../economy");

    if (!economy.spendCoins?.(member.id, boost.price)) {
      return {
        success: false,
        message: `❌ Not enough coins. Required: **${boost.price}** <:CASHH:1491180511308157041>`
      };
    }

    const endTime = Date.now() + boost.duration;

    activeBoosts.set(member.id, {
      multiplier: boost.multiplier,
      endTime,
      name: boost.name,
      type: "shop"
    });

    saveBoosts();

    // DM (silent fail)
    try {
      await member.send({
        embeds: [
          {
            color: 0x0b0b0f,
            title: "🖤 Boost Activated",
            description:
              `> **${boost.name}**\n` +
              `> Duration: **${Math.floor(boost.duration / 60000)} min**\n\n` +
              `> Spent: **${boost.price}** <:CASHH:1491180511308157041>`,
            footer: { text: "VYRN BOOST SYSTEM" }
          }
        ]
      });
    } catch {}

    return { success: true, boost };

  } catch (err) {
    console.error("🔥 BOOST BUY ERROR:", err);
    return {
      success: false,
      message: "❌ Internal boost error."
    };
  }
}

// ====================== AUTO CLEAN LOOP ======================
setInterval(() => {
  cleanExpired();
}, 60 * 1000);

// ====================== INIT ======================
function init() {
  loadBoosts();
  console.log("🖤 Boost System (Black Pro) ready");
}

// ====================== EXPORT ======================
module.exports = {
  init,
  loadBoosts,
  saveBoosts,
  getCurrentBoost,
  buyBoost,
  SHOP_BOOSTS,
  activeBoosts
};
