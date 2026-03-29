const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/config.json");

// AUTO CREATE
function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "{}");
  }
}

// LOAD
function load() {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.log("❌ CONFIG LOAD ERROR:", err);
    return {};
  }
}

// SAVE
function save(data) {
  try {
    ensureFile();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("❌ CONFIG SAVE ERROR:", err);
  }
}

// GET
function getConfig(guildId) {
  const data = load();
  return data[guildId] || {};
}

// SET
function setConfig(guildId, key, value) {
  const data = load();

  if (!data[guildId]) data[guildId] = {};
  data[guildId][key] = value;

  save(data);
}

module.exports = {
  getConfig,
  setConfig
};
