const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  messageId: String,
  channelId: String,
  reward: String,
  winners: Number,
  endTime: Number,
  participants: [String],
  ended: Boolean
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
