const { EmbedBuilder } = require("discord.js");

let currentGame = null;

// ====================== LISTA POLSKICH SŁÓW ======================
const WORDS = [
  "zamek", "smok", "rycerz", "miecz", "tarcza", "ogień", "las", "góra", "rzeka",
  "wioska", "król", "królowa", "książę", "wojownik", "bitwa", "zwycięstwo",
  "legenda", "przygoda", "skarbiec", "złoto", "magia", "czarodziej", "potwór",
  "loch", "klucz", "brama", "most", "wieża", "forteca", "armia", "koń", "łuk",
  "strzała", "burza", "wiatr", "deszcz", "słońce", "księżyc", "odwaga", "honor",
  "siła", "mądrość", "wolność", "epika", "heros", "smocze", "rycerski"
];

// ====================== LOSOWA NAGRODA ======================
function getRandomReward() {
  const chanceForMultiplier = Math.random();

  if (chanceForMultiplier < 0.35) { 
    // 35% szansy na mnożnik
    const multipliers = [
      { value: 1.5, weight: 40 },
      { value: 2.0, weight: 25 },
      { value: 2.5, weight: 15 },
      { value: 3.0, weight: 10 },
      { value: 4.0, weight: 5 },
      { value: 5.0, weight: 1 }   // bardzo rzadki
    ];

    let totalWeight = multipliers.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;

    for (const mult of multipliers) {
      random -= mult.weight;
      if (random <= 0) {
        const duration = getDurationForMultiplier(mult.value);
        return {
          type: "multiplier",
          value: mult.value,
          duration: duration,
          durationMin: Math.floor(duration / 60000)
        };
      }
    }
  }

  // Zwykły XP
  const xp = Math.floor(180 + Math.random() * 170); // 180 - 349 XP
  return { type: "xp", value: xp };
}

function getDurationForMultiplier(multi) {
  if (multi >= 4.5) return 6 * 60 * 1000;   // 6 min
  if (multi >= 3.5) return 10 * 60 * 1000;  // 10 min
  if (multi >= 2.5) return 15 * 60 * 1000;  // 15 min
  return 20 * 60 * 1000;                    // 20 min
}

// ====================== GAME LOGIC ======================
function getRandomWord() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const revealed = "⬛".repeat(word.length);
  return { word, revealed };
}

async function tryStartRandomGame(channel) {
  if (currentGame) return false;
  if (Math.random() > 0.06) return false; // 6% szansy na start gry

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
`Wpisz poprawne słowo!\n` +
`Czas: **30 sekund**`
    )
    .setFooter({ text: "Nagroda: losowy XP lub mnożnik!" });

  await channel.send({ embeds: [embed] });

  let timeLeft = 30;
  currentGame.timeout = setInterval(() => {
    timeLeft -= 5;
    if (timeLeft <= 0) endGame(channel, false);
  }, 5000);

  return true;
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
      const endTime = Date.now() + reward.duration;

      // Zapisz boost (przez boostSystem)
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
      // Zwykły XP
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
