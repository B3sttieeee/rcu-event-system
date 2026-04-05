const fs = require("fs");
const path = require("path");

const DATA_DIR = "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");

let activeBoosts = new Map(); // userId => { multiplier, endTime, name }

// ====================== INIT ======================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadBoosts() {
  if (!fs.existsSync(BOOST_PATH)) {
    fs.writeFileSync(BOOST_PATH, JSON.stringify({}, null, 2));
    return;
  }
  try {
    const data = JSON.parse(fs.readFileSync(BOOST_PATH, "utf-8"));
    activeBoosts = new Map(Object.entries(data));
    console.log(`[BOOST] Załadowano ${activeBoosts.size} aktywnych boostów`);
  } catch (err) {
    console.error("[BOOST] Błąd odczytu activeBoosts.json");
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

async function tryGiveRandomBoost(member) {
  if (!member || member.user.bot) return false;

  // Szansa 8% na lucky boost
  if (Math.random() > 0.08) return false;

  const boostsPool = [
    { multiplier: 1.5, duration: 15 * 60 * 1000, name: "1.5x XP" },
    { multiplier: 2.0, duration: 10 * 60 * 1000, name: "2x XP" },
    { multiplier: 2.5, duration: 7 * 60 * 1000,  name: "2.5x XP" },
  ];

  const chosen = boostsPool[Math.floor(Math.random() * boostsPool.length)];
  const endTime = Date.now() + chosen.duration;

  activeBoosts.set(member.id, {
    multiplier: chosen.multiplier,
    endTime: endTime,
    name: chosen.name
  });

  saveBoosts();

  // Powiadomienie na PV
  const embed = {
    color: 0x00ff88,
    title: "🎉 LUCKY BOOST!",
    description: `Otrzymałeś **${chosen.name}** na **${Math.floor(chosen.duration / 60000)} minut**!`,
    footer: { text: "Grinduj szybciej! 🔥" }
  };

  try {
    await member.send({ embeds: [embed] }).catch(() => {});
  } catch (e) {}

  return true;
}

// ====================== EXPORT ======================
module.exports = {
  getCurrentBoost,
  tryGiveRandomBoost,
  loadBoosts
};
