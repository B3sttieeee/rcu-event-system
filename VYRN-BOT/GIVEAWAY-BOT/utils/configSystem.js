const fs = require("fs").promises;
const path = require("path");

const filePath = path.join(__dirname, "../data/config.json");

// AUTO CREATE
async function ensureFile() {
  const dir = path.dirname(filePath);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "{}");
  }
}

// LOAD
async function load() {
  try {
    await ensureFile();
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.log("❌ CONFIG LOAD ERROR:", err);
    return {};
  }
}

// SAVE
async function save(data) {
  try {
    await ensureFile();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("❌ CONFIG SAVE ERROR:", err);
  }
}

// GET
async function getConfig(guildId) {
  const data = await load();
  return data[guildId] || {};
}

// SET
async function setConfig(guildId, key, value) {
  const data = await load();

  if (!data[guildId]) data[guildId] = {};
  data[guildId][key] = value;

  await save(data);
}

module.exports = {
  getConfig,
  setConfig
};
