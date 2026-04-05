const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_DIR = "/data";
const WORDS_PATH = path.join(DATA_DIR, "guessWords.json");

let currentGame = null;

// ====================== INIT - POLSKA LISTA SŁÓW ======================
function loadWords() {
  if (!fs.existsSync(WORDS_PATH)) {
    const defaultWords = [
      "zamek", "smok", "rycerz", "miecz", "tarcza", "ogień", "las", "góra",
      "rzeka", "wioska", "król", "królowa", "książę", "wojownik", "bitwa",
      "zwycięstwo", "legenda", "hero", "przygoda", "skarbiec", "złoto",
      "magia", "czarodziej", "potwór", "loch", "klucz", "brama", "most",
      "wieża", "forteca", "armia", "kon", "łuk", "strzała", "tarcza",
      "ogień", "lód", "burza", "wiatr", "deszcz", "słońce", "księżyc"
    ];
    fs.writeFileSync(WORDS_PATH, JSON.stringify(defaultWords, null, 2));
    console.log("[WORDGUESS] Utworzono domyślną listę polskich słów");
    return defaultWords;
  }

  try {
    const data = fs.readFileSync(WORDS_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("[WORDGUESS] Błąd odczytu guessWords.json");
    return ["zamek", "smok", "rycerz"];
  }
}

const wordList = loadWords();

// ====================== LOSOWANIE ======================
function generateRandomWord() {
  const word = wordList[Math.floor(Math.random() * wordList.length)];
  const revealed = "⬛".repeat(word.length);
  return { word, revealed };
}

// ====================== START GAME ======================
async function tryStartRandomGame(channel) {
  if (currentGame) return false;

  if (Math.random() > 0.065) return false;   // ~6.5% szansy

  const { word, revealed } = generateRandomWord();

  currentGame = {
    channelId: channel.id,
    word: word.toLowerCase(),
    revealed: revealed,
    timeout: null
  };

  const embed = new EmbedBuilder()
    .setColor("#ffaa00")
    .setTitle("🎲 Zgadywanie Polskiego Słowa!")
    .setDescription(
`**Słowo do zgadnięcia:**\n` +
`> \`${revealed}\`\n\n` +
`Wpisz poprawne słowo w czat!\n` +
`Czas: **30 sekund**`
    )
    .setFooter({ text: "Pierwszy kto zgadnie dostaje bonus XP!" });

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

    const bonusXP = Math.floor(180 + Math.random() * 150); // 180-329 XP

    const embed = new EmbedBuilder()
      .setColor("#00ff88")
      .setTitle("✅ Poprawna odpowiedź!")
      .setDescription(
`${message.author} zgadł słowo **${currentGame.word}**!\n` +
`Otrzymujesz **${bonusXP} XP**! 🎉`
      );

    await message.channel.send({ embeds: [embed] }).catch(() => {});

    try {
      const { addXP } = require("./levelSystem");
      await addXP(message.member, bonusXP);
    } catch (e) {}

    currentGame = null;
    return true;
  }
  return false;
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
