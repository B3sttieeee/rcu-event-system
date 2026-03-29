const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/config.json");

function load() {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath));
}

function save(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getConfig(guildId) {
  const data = load();
  return data[guildId] || {};
}

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
