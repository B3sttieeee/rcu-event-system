const { EmbedBuilder } = require("discord.js");

let currentGame = null;

// ====================== LISTA POLSKICH SŁÓW ======================
const WORDS = [
  "zamek", "smok", "rycerz", "miecz", "tarcza", "ogień", "las", "góra", "rzeka",
  "wioska", "król", "królowa", "książę", "wojownik", "bitwa", "zwycięstwo",
  "legenda", "przygoda", "skarbiec", "złoto", "magia", "czarodziej", "potwór",
  "loch", "klucz", "brama", "most", "wieża", "forteca", "armia", "koń", "łuk",
  "strzała", "burza", "wiatr", "deszcz", "słońce", "księżyc", "odwaga", "honor",
  "siła", "mądrość", "wolność", "epika", "heros"
];

// ====================== LOSOWA NAGRODA ======================
function getRandomReward() {
  if (Math.random() < 0.38) { // 38% szansy na mnożnik
    const multipliers = [
      { value: 1.5, chance: 35 },
      { value: 2.0, chance: 25 },
      { value: 2.5, chance: 18 },
      { value: 3.0, chance: 12 },
      { value: 4.0, chance: 7 },
      { value: 5.0, chance: 3 }   // tylko 3% na x5
    ];

    let total = multipliers.reduce((sum, m) => sum + m.chance, 0);
    let roll = Math.random() * total;

    for (const m of multipliers) {
      roll -= m.chance;
      if (roll <= 0) {
        const duration = m.value >= 4 ? 8 : m.value >= 3 ? 12 : 18; // minuty
        return {
          type: "multiplier",
          value: m.value,
          durationMin: duration
        };
      }
    }
  }

  // Zwykły XP
  const xp = Math.floor(190 + Math.random() * 160); // 190-349 XP
  return { type: "xp", value: xp };
}

// ====================== GAME ======================
function getRandomWord() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const revealed = "⬛".repeat(word.length);
  return { word, revealed };
}

async function tryStartRandomGame(channel, forced = false) {
  if (currentGame) {
    return { success: false, reason: "game_already_running" };
  }

  // Jeśli uruchomione ręcznie (/wordguess) - pomijamy losową szansę
  if (!forced && Math.random() > 0.065) {
    return { success: false, reason: "random_chance_failed" };
  }

  const { word, revealed } = getRandomWord();

  currentGame = {
    channelId: channel.id,
    word: word.toLowerCase(),
    revealed: revealed,
    timeout: null
  };

  const embed = new EmbedBuilder()
    .setColor("#ffaa00")
    .setTitle("🎲 Zgadywanie Słowa!")
    .setDescription(
`**Słowo do zgadnięcia:**\n` +
`> \`${revealed}\`\n\n` +
`Wpisz poprawne słowo w czat!\n` +
`Czas: **30 sekund**`
    )
    .setFooter({ text: "Nagroda: zwykły XP lub losowy mnożnik!" });

  await channel.send({ embeds: [embed] }).catch(() => {});

  let timeLeft = 30;
  currentGame.timeout = setInterval(() => {
    timeLeft -= 5;
    if (timeLeft <= 0) endGame(channel, false);
  }, 5000);

  return { success: true };
}

async function checkAnswer(message) {
  if (!currentGame || message.channel.id !== currentGame.channelId) return false;

  const guess = message.content.toLowerCase().trim();

  if (guess === currentGame.word) {
    clearInterval(currentGame.timeout);

    const reward = getRandomReward();
    let embed;

    if (reward.type === "multiplier") {
      // Aktywacja mnożnika
      const endTime = Date.now() + (reward.durationMin * 60 * 1000);

      try {
        const boostSystem = require("./boostSystem");
        boostSystem.activeBoosts.set(message.author.id, {
          multiplier: reward.value,
          endTime: endTime,
          name: `${reward.value}x XP`
        });
        boostSystem.saveBoosts();
      } catch (e) {}

      embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("🎉 WYGRAŁEŚ MNOŻNIK!")
        .setDescription(
`${message.author} zgadł słowo **${currentGame.word}**!\n\n` +
`Otrzymujesz **${reward.value}x XP** na **${reward.durationMin} minut**! 🔥`
        );
    } else {
      try {
        const { addXP } = require("./levelSystem");
        await addXP(message.member, reward.value);
      } catch (e) {}

      embed = new EmbedBuilder()
        .setColor("#00ff88")
        .setTitle("✅ Poprawna odpowiedź!")
        .setDescription(
`${message.author} zgadł słowo **${currentGame.word}**!\n` +
`Otrzymujesz **${reward.value} XP**!`
        );
    }

    await message.channel.send({ embeds: [embed] }).catch(() => {});

    currentGame = null;
    return true;
  }
  return false;
}

function endGame(channel, won = false) {
  if (!currentGame) return;

  clearInterval(currentGame.timeout);

  if (!won) {
    const embed = new EmbedBuilder()
      .setColor("#ff5555")
      .setTitle("⏰ Czas minął!")
      .setDescription(`Słowo to było: **${currentGame.word}**`);
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  currentGame = null;
}

// ====================== EXPORT ======================
module.exports = {
  tryStartRandomGame,
  checkAnswer
};
