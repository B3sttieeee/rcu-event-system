const { Events } = require("discord.js");

const profile = require("../systems/profile");
const economy = require("../systems/economy");
const level = require("../systems/level");

// ====================== STATE ======================
const sessions = new Map();

// ====================== CONFIG ======================
const MINUTE = 60000;

// AFK optional
const AFK_CHANNELS = new Set();

// ====================== HELP ======================
function isValid(channelId) {
  return channelId && !AFK_CHANNELS.has(channelId);
}

function stop(userId) {
  const data = sessions.get(userId);

  if (data?.interval) {
    clearInterval(data.interval);
  }

  sessions.delete(userId);
}

// ====================== START SESSION ======================
function start(member) {
  const userId = member.id;

  // zawsze reset starej sesji
  stop(userId);

  const interval = setInterval(async () => {
    try {
      const fresh =
        member.guild.members.cache.get(userId) ||
        (await member.guild.members.fetch(userId).catch(() => null));

      if (!fresh?.voice?.channelId) {
        stop(userId);
        return;
      }

      if (!isValid(fresh.voice.channelId)) return;

      // ====================== REWARDS ======================
      profile.addVoiceTime(userId, 60); // seconds
      economy.addCoins(userId, 8);

      const user = level.handleVoiceXP(fresh);

      console.log(
        `[VOICE] ${fresh.user.tag} | +1m | +8 coins | +10 XP | LVL ${user.level} | XP ${user.totalXP}`
      );

    } catch (err) {
      console.error("[VOICE ERROR]", err);
    }
  }, MINUTE);

  sessions.set(userId, { interval });
}

// ====================== EVENT ======================
module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const id = member.id;

      const oldC = oldState.channelId;
      const newC = newState.channelId;

      // JOIN
      if (!oldC && newC) {
        if (isValid(newC)) {
          start(member);
          console.log(`[VOICE JOIN] ${member.user.tag}`);
        }
        return;
      }

      // LEAVE
      if (oldC && !newC) {
        stop(id);
        console.log(`[VOICE LEAVE] ${member.user.tag}`);
        return;
      }

      // SWITCH
      if (oldC && newC && oldC !== newC) {
        stop(id);

        if (isValid(newC)) {
          start(member);
          console.log(`[VOICE SWITCH] ${member.user.tag}`);
        }
      }

    } catch (err) {
      console.error("[VOICE STATE ERROR]", err);
    }
  }
};
