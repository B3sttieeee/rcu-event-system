const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  warns: [
    {
      reason: String,
      date: Number
    }
  ]
});

module.exports = mongoose.model('Warn', warnSchema);
