const { EmbedBuilder } = require("discord.js");
const { tryGiveRandomBoost } = require("./boostSystem");

let currentGame = null;

// ====================== POLSKA LISTA SŁÓW ======================
const WORDS = [
  "zamek", "smok", "rycerz", "miecz", "tarcza", "ogień", "las", "góra", "rzeka",
  "wioska", "król", "królowa", "książę", "wojownik", "bitwa", "zwycięstwo",
  "legenda", "przygoda", "skarbiec", "złoto", "magia", "czarodziej", "potwór",
  "loch", "klucz", "brama", "most", "wieża", "forteca", "armia", "koń", "łuk",
  "strzała", "burza", "wiatr", "deszcz", "słońce", "księżyc", "heros", "epika"
];

// ====================== GENEROWANIE SŁOWA ======================
function getRandomWord() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const revealed = "⬛".repeat(word.length);
  return { word, revealed };
}

// ====================== START GAME ======================
async function tryStartRandomGame(channel) {
  if (currentGame) return false;
  if (Math.random() > 0.065) return false;   // ~6.5% szansy

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
    .setFooter({ text: "Pierwszy kto zgadnie dostaje losową nagrodę!" });

  await channel.send({ embeds: [embed] }).catch(() => {});

  let timeLeft = 30;
  currentGame.timeout = setInterval(() => {
    timeLeft -= 5;
    if (timeLeft <= 0) endGame(channel, false);
  }, 5000);

  return true;
}

// ====================== CHECK ANSWER ======================
async function checkAnswer(message) {
  if (!currentGame || message.channel.id !== currentGame.channelId) return false;

  const guess = message.content.toLowerCase().trim();

  if (guess === currentGame.word) {
    clearInterval(currentGame.timeout);

    // LOSOWA NAGRODA
    const isBoost = Math.random() < 0.45; // 45% szansy na boost, 55% na zwykły XP

    if (isBoost) {
      // Nagroda: Boost XP
      await giveBoostReward(message);
    } else {
      // Nagroda: Zwykły XP
      await giveXPReward(message);
    }

    currentGame = null;
    return true;
  }
  return false;
}

// ====================== NAGRODA - BOOST ======================
async function giveBoostReward(message) {
  const { getCurrentBoost } = require("./boostSystem");

  // Dajemy losowy boost
  const success = await tryGiveRandomBoost(message.member);

  if (success) {
    const embed = new EmbedBuilder()
      .setColor("#00ff88")
      .setTitle("🎉 WYGRAŁEŚ BOOST!")
      .setDescription(`${message.author} zgadł słowo i otrzymał **losowy czasowy boost XP**!`);

    await message.channel.send({ embeds: [embed] }).catch(() => {});
  } else {
    // fallback jeśli boost nie zadziałał
    await giveXPReward(message);
  }
}

// ====================== NAGRODA - ZWYKŁY XP ======================
async function giveXPReward(message) {
  const bonusXP = Math.floor(200 + Math.random() * 150); // 200 - 349 XP

  const embed = new EmbedBuilder()
    .setColor("#00ff88")
    .setTitle("✅ Poprawna odpowiedź!")
    .setDescription(
`${message.author} zgadł słowo!\n` +
`Otrzymujesz **${bonusXP} XP**! 🎉`
    );

  await message.channel.send({ embeds: [embed] }).catch(() => {});

  try {
    const { addXP } = require("./levelSystem");
    await addXP(message.member, bonusXP);
  } catch (e) {
    console.error("Błąd dodawania XP:", e);
  }
}

// ====================== END GAME ======================
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
