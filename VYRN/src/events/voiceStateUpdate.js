// =====================================================
// VOICE STATE UPDATE - INTEGRATED WITH PRIVATE VC + XP
// =====================================================
const { Events } = require("discord.js");
const privateVC = require("../systems/privatevc");
const profile = require("../systems/profile");
const economy = require("../systems/economy");
const level = require("../systems/level");

const sessions = new Map(); // userId => interval

const MINUTE = 60000;

function stopSession(userId) {
  const data = sessions.get(userId);
  if (data?.interval) clearInterval(data.interval);
  sessions.delete(userId);
}

function startSession(member) {
  const userId = member.id;
  stopSession(userId);

  const interval = setInterval(async () => {
    try {
      const fresh = member.guild.members.cache.get(userId) ||
                    await member.guild.members.fetch(userId).catch(() => null);

      if (!fresh?.voice?.channelId) {
        stopSession(userId);
        return;
      }

      // ====================== REWARDS ======================
      profile.addVoiceTime(userId, 60);
      economy.addCoins(userId, 8);
      level.handleVoiceXP(fresh);           // ← tutaj XP + monety

      console.log(`[VOICE] ${fresh.user.tag} | +60s | +8 coins | +10 XP`);

    } catch (err) {
      console.error(`[VOICE ERROR] ${member.user.tag}`, err.message);
    }
  }, MINUTE);

  sessions.set(userId, { interval });
  console.log(`[VOICE JOIN] ${member.user.tag} — sesja XP rozpoczęta`);
}

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const oldC = oldState.channelId;
      const newC = newState.channelId;

      // Private VC Creation
      if (!oldC && newC && newC === "1496280414237491220") {
        await privateVC.handlePrivateChannelCreation(member);
        return;
      }

      // Normal Voice Rewards
      if (!oldC && newC) {
        startSession(member);
      } else if (oldC && !newC) {
        stopSession(member.id);
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
      } else if (oldC && newC && oldC !== newC) {
        stopSession(member.id);
        startSession(member);
      }
    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
