const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
  guildId: String,
  messageId: String
});

module.exports = mongoose.model('Panel', panelSchema);
