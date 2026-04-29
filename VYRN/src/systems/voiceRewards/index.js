// src/systems/voiceRewards/index.js
const { Events } = require("discord.js");
const activity = require("../activity"); // Połączenie z zaawansowanym systemem Activity
const economy = require("../economy");   // Połączenie z systemem Ekonomii 💰

// =====================================================
// VYRN • VOICE REWARDS ENGINE 🎙️
// =====================================================
const sessions = new Map();
const MINUTE = 60000; // 1 minuta w milisekundach

// Konfiguracja nagród
const REWARDS = {
  XP_PER_MINUTE: 10,
  VOICE_SECONDS: 60,
  COINS_PER_MINUTE: 10 // Ilość monet dodawanych co minutę (możesz zmienić)
};

function stopSession(userId) {
  const data = sessions.get(userId);
  if (data?.interval) clearInterval(data.interval);
  sessions.delete(userId);
}

function startSession(member) {
  const userId = member.id;
  
  // Zabezpieczenie przed podwójnymi sesjami
  stopSession(userId);

  const interval = setInterval(() => {
    try {
      const freshMember = member.guild.members.cache.get(userId);
      
      // Jeśli użytkownika nie ma już na serwerze lub na kanale głosowym - kończymy sesję
      if (!freshMember || !freshMember.voice.channelId) {
        return stopSession(userId);
      }

      // 🛡️ ANTI-AFK SYSTEM: Nie dajemy XP, czasu ani KASY, jeśli użytkownik ma wyciszone słuchawki
      if (freshMember.voice.selfDeaf || freshMember.voice.serverDeaf) {
        return; 
      }

      // 📊 1. Dodawanie czasu spędzonego na VC
      activity.addVoiceTime(userId, REWARDS.VOICE_SECONDS);
      
      // 🏆 2. Dodawanie Punktów Doświadczenia (XP)
      activity.addActivityXP(freshMember, REWARDS.XP_PER_MINUTE);

      // 💰 3. Dodawanie Monet do portfela!
      economy.addCoins(userId, REWARDS.COINS_PER_MINUTE);

    } catch (err) { 
      console.error(`🔥 [VOICE ERR] Nie udało się przydzielić nagród dla ${userId}:`, err.message); 
      stopSession(userId); // W razie błędu bezpiecznie zamykamy sesję
    }
  }, MINUTE);

  sessions.set(userId, { interval });
}

// ====================== INIT ======================
function init(client) {
  console.log("🎙️ [VYRN] Inicjalizacja systemu Voice Rewards (XP & Coins)...");

  // 1. Nasłuchiwanie zmian na kanałach głosowych (Wejście / Wyjście)
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (newState.member.user.bot) return; // Ignorujemy boty

    // Użytkownik dołączył do kanału głosowego
    if (!oldState.channelId && newState.channelId) {
      startSession(newState.member);
    }
    // Użytkownik wyszedł z kanału głosowego
    else if (oldState.channelId && !newState.channelId) {
      stopSession(newState.member.id);
    }
  });

  // 2. AUTO-RESUME: Łapanie użytkowników, którzy już są na VC podczas restartu bota
  let activeSessions = 0;
  client.guilds.cache.forEach(guild => {
    guild.voiceStates.cache.forEach(voiceState => {
      if (voiceState.channelId && !voiceState.member.user.bot) {
        startSession(voiceState.member);
        activeSessions++;
      }
    });
  });

  console.log(`✅ [VOICE] System aktywny. Wznowiono śledzenie dla ${activeSessions} użytkowników.`);
}

module.exports = { 
  init, 
  startSession, 
  stopSession 
};
