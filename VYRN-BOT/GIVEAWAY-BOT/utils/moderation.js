const fs = require("fs");
const path = require("path");

// ===== PATH (NAPRAWIONE - DZIAŁA NA HOSTINGU) =====
const PATH = path.join(__dirname, "../data/moderation.json");

// ===== LOAD =====
function load() {
  try {
    if (!fs.existsSync(PATH)) {
      fs.writeFileSync(PATH, JSON.stringify({ cases: [] }, null, 2));
    }

    const raw = fs.readFileSync(PATH);
    return JSON.parse(raw);

  } catch (err) {
    console.log("❌ LOAD ERROR:", err);
    return { cases: [] };
  }
}

// ===== SAVE =====
function save(data) {
  try {
    fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("❌ SAVE ERROR:", err);
  }
}

// ===== CREATE CASE =====
function createCase(input) {
  const data = load();

  const id = data.cases.length > 0
    ? data.cases[data.cases.length - 1].id + 1
    : 1;

  const newCase = {
    id,
    userId: input.userId,
    moderatorId: input.moderatorId,
    type: input.type,
    reason: input.reason || "No reason",
    duration: input.duration || null,
    date: Date.now()
  };

  data.cases.push(newCase);
  save(data);

  console.log("✅ CASE CREATED:", newCase);

  return newCase;
}

// ===== GET USER CASES =====
function getUserCases(userId) {
  const data = load();
  return data.cases.filter(c => c.userId === userId);
}

// ===== GET SINGLE CASE =====
function getCase(id) {
  const data = load();
  return data.cases.find(c => c.id === id);
}

// ===== EXPORT =====
module.exports = {
  createCase,
  getUserCases,
  getCase
};
