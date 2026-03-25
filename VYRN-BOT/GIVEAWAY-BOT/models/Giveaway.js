const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  guildId: String,

  reward: String,
  winners: Number,
  endTime: Number,

  bonusRole: String,
  requiredRole: String,

  participants: [String],
  ended: { type: Boolean, default: false }
});

module.exports = mongoose.model('Giveaway', schema);
