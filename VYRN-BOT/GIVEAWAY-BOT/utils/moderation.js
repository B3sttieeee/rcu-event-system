const fs = require("fs");

const PATH = "./data/moderation.json";

function load() {
  try {
    return JSON.parse(fs.readFileSync(PATH));
  } catch {
    return { cases: [] };
  }
}

function save(data) {
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}

function createCase(dataInput) {
  const data = load();

  const id = data.cases.length + 1;

  const newCase = {
    id,
    userId: dataInput.userId,
    moderatorId: dataInput.moderatorId,
    type: dataInput.type,
    reason: dataInput.reason,
    duration: dataInput.duration || null,
    date: Date.now()
  };

  data.cases.push(newCase);
  save(data);

  return newCase;
}

function getUserCases(userId) {
  const data = load();
  return data.cases.filter(c => c.userId === userId);
}

function getCase(id) {
  const data = load();
  return data.cases.find(c => c.id === id);
}

module.exports = {
  createCase,
  getUserCases,
  getCase
};
