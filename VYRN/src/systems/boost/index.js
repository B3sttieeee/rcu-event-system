const fs = require("fs");
const path = require("path");

// ====================== PATH ======================
const DATA_DIR = process.env.DATA_DIR || "/data";
const BOOST_PATH = path.join(DATA_DIR, "activeBoosts.json");

// ====================== CACHE ======================
let activeBoosts = new Map();

// ====================== INIT FOLDER ======================
if (!fs.existsSync(DATA_DIR)) {
fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====================== SAFE PARSE ======================
function safeParse(json, fallback = {}) {
try {
return JSON.parse(json);
} catch {
return fallback;
}
}

// ====================== LOAD ======================
function loadBoosts() {
try {
if (!fs.existsSync(BOOST_PATH)) {
fs.writeFileSync(BOOST_PATH, JSON.stringify({}, null, 2));
activeBoosts = new Map();
return;
}

const raw = fs.readFileSync(BOOST_PATH, "utf8");
const data = safeParse(raw, {});

activeBoosts = new Map();

for (const [id, boost] of Object.entries(data)) {
activeBoosts.set(id, {
multiplier: Number(boost?.multiplier || 1),
endTime: Number(boost?.endTime || 0),
name: boost?.name || "unknown",
type: boost?.type || "shop"
});
}

} catch (err) {
console.error("[BOOST LOAD ERROR]", err.message);
activeBoosts = new Map();
}
}

// ====================== SAVE ======================
function saveBoosts() {
try {
const obj = {};

for (const [id, boost] of activeBoosts.entries()) {
obj[id] = boost;
}

fs.writeFileSync(BOOST_PATH, JSON.stringify(obj, null, 2));
} catch (err) {
console.error("[BOOST SAVE ERROR]", err.message);
}
}

// ====================== CLEAN ======================
function cleanExpired() {
const now = Date.now();

for (const [id, boost] of activeBoosts.entries()) {
if (!boost?.endTime || boost.endTime <= now) {
activeBoosts.delete(id);
}
}
}

// ====================== GET BOOST ======================
function getCurrentBoost(userId) {
cleanExpired();

const boost = activeBoosts.get(userId);

if (!boost) return 1;
if (boost.endTime <= Date.now()) return 1;

return boost.multiplier || 1;
}

// ====================== SHOP ======================
const SHOP_BOOSTS = [
{ id: "1", name: "1.5x XP", multiplier: 1.5, duration: 25 * 60 * 1000, price: 180 },
{ id: "2", name: "2.0x XP", multiplier: 2.0, duration: 18 * 60 * 1000, price: 350 },
{ id: "3", name: "2.5x XP", multiplier: 2.5, duration: 12 * 60 * 1000, price: 550 },
{ id: "4", name: "3.0x XP", multiplier: 3.0, duration: 8 * 60 * 1000, price: 950 }
];

// ====================== BUY ======================
async function buyBoost(member, boostId) {
try {
const economy = require("../economy/index.js");
const spendCoins = economy.spendCoins;

const boost = SHOP_BOOSTS.find(b => b.id === String(boostId));
if (!boost) {
return { success: false, message: "❌ Boost not found" };
}

if (!spendCoins || !spendCoins(member.id, boost.price)) {
return {
success: false,
message: `❌ Not enough coins (${boost.price})`
};
}

activeBoosts.set(member.id, {
multiplier: boost.multiplier,
endTime: Date.now() + boost.duration,
name: boost.name,
type: "shop"
});

saveBoosts();

return { success: true, boost };

} catch (err) {
console.error("[BOOST BUY ERROR]", err);
return { success: false, message: "❌ Internal error" };
}
}

// ====================== AUTO CLEAN ======================
setInterval(cleanExpired, 60 * 1000);

// ====================== INIT ======================
function init() {
loadBoosts();
console.log("🖤 Boost System ready (FIXED)");
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
